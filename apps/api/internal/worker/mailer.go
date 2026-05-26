package worker

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
)

type mailAttachment struct {
	Filename    string
	ContentType string
	Data        []byte
}

func (p *Processor) sendMail(ctx context.Context, to, subject, body string, attachments []mailAttachment) (string, error) {
	if strings.TrimSpace(to) == "" {
		return "", fmt.Errorf("%w: missing_recipient", ErrPermanent)
	}
	if strings.TrimSpace(p.options.ResendAPIKey) != "" {
		return p.sendResendEmail(ctx, to, subject, body, attachments)
	}
	if p.gmailConfigured() {
		fromHeader := strings.TrimSpace(p.options.GmailSenderFrom)
		messageID := fmt.Sprintf("<%s@simone-shop>", uuid.NewString())
		message := buildMailMessage(fromHeader, to, subject, messageID, body, attachments)
		gmailMessageID, err := p.gmailSendRawMessage(ctx, message)
		if err != nil {
			return "", err
		}
		return gmailMessageID, nil
	}
	return "", fmt.Errorf("%w: no_email_provider_configured", ErrPermanent)
}

func (p *Processor) sendResendEmail(ctx context.Context, to, subject, body string, attachments []mailAttachment) (string, error) {
	htmlBody := textToHTML(body)
	fromAddr := "Delqhi Shop <onboarding@resend.dev>"
	if strings.TrimSpace(p.options.ResendFromDomain) != "" {
		fromAddr = fmt.Sprintf("Delqhi Shop <shop@%s>", p.options.ResendFromDomain)
	}
	reqPayload := map[string]any{
		"from":    fromAddr,
		"to":      []string{to},
		"subject": subject,
		"html":    htmlBody,
	}
	if len(attachments) > 0 {
		resendAttachments := make([]map[string]any, 0, len(attachments))
		for _, a := range attachments {
			resendAttachments = append(resendAttachments, map[string]any{
				"filename":    a.Filename,
				"content_type": a.ContentType,
				"content":      base64.StdEncoding.EncodeToString(a.Data),
			})
		}
		reqPayload["attachments"] = resendAttachments
	}

	payloadBytes, _ := json.Marshal(reqPayload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(payloadBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+p.options.ResendAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("resend_api_error: %d", resp.StatusCode)
	}

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "resend-sent", nil
	}
	if id, ok := result["id"].(string); ok {
		return id, nil
	}
	return "resend-sent", nil
}

func textToHTML(plain string) string {
	escaped := strings.ReplaceAll(plain, "&", "&amp;")
	escaped = strings.ReplaceAll(escaped, "<", "&lt;")
	escaped = strings.ReplaceAll(escaped, ">", "&gt;")
	escaped = strings.ReplaceAll(escaped, "\n", "<br>")
	return fmt.Sprintf(`<html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;max-width:600px;margin:0 auto;padding:20px;">%s</body></html>`, escaped)
}

func buildMailMessage(from, to, subject, messageID, body string, attachments []mailAttachment) []byte {
	var buf bytes.Buffer
	buf.WriteString(fmt.Sprintf("From: %s\r\n", from))
	buf.WriteString(fmt.Sprintf("To: %s\r\n", to))
	buf.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	buf.WriteString(fmt.Sprintf("Message-ID: %s\r\n", messageID))
	buf.WriteString("MIME-Version: 1.0\r\n")

	if len(attachments) == 0 {
		buf.WriteString("Content-Type: text/plain; charset=UTF-8\r\n\r\n")
		buf.WriteString(body)
		return buf.Bytes()
	}

	boundary := fmt.Sprintf("simone-%d", time.Now().UnixNano())
	buf.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=%s\r\n\r\n", boundary))
	buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buf.WriteString("Content-Type: text/plain; charset=UTF-8\r\n\r\n")
	buf.WriteString(body)
	buf.WriteString("\r\n")

	for _, attachment := range attachments {
		buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		buf.WriteString(fmt.Sprintf("Content-Type: %s; name=%q\r\n", attachment.ContentType, attachment.Filename))
		buf.WriteString("Content-Transfer-Encoding: base64\r\n")
		buf.WriteString(fmt.Sprintf("Content-Disposition: attachment; filename=%q\r\n\r\n", attachment.Filename))
		encoded := base64.StdEncoding.EncodeToString(attachment.Data)
		for len(encoded) > 76 {
			buf.WriteString(encoded[:76] + "\r\n")
			encoded = encoded[76:]
		}
		buf.WriteString(encoded + "\r\n")
	}

	buf.WriteString(fmt.Sprintf("--%s--\r\n", boundary))
	return buf.Bytes()
}

func extractAddress(raw string) string {
	parsed, err := mail.ParseAddress(raw)
	if err != nil {
		return strings.TrimSpace(raw)
	}
	return parsed.Address
}
