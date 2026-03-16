package objectstore

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	awscfg "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type R2Config struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	Bucket          string
	PresignTTL      time.Duration
}

type UploadedObject struct {
	Bucket      string
	Key         string
	ETag        string
	ContentType string
	SizeBytes   int64
}

type PresignedRequest struct {
	URL     string
	Method  string
	Headers map[string]string
}

type R2Client struct {
	bucket     string
	presignTTL time.Duration
	client     *s3.Client
	presign    *s3.PresignClient
}

func NewR2(ctx context.Context, cfg R2Config) (*R2Client, error) {
	accountID := strings.TrimSpace(cfg.AccountID)
	accessKeyID := strings.TrimSpace(cfg.AccessKeyID)
	secretAccessKey := strings.TrimSpace(cfg.SecretAccessKey)
	bucket := strings.TrimSpace(cfg.Bucket)

	if accountID == "" && accessKeyID == "" && secretAccessKey == "" && bucket == "" {
		return nil, nil
	}
	if accountID == "" || accessKeyID == "" || secretAccessKey == "" || bucket == "" {
		return nil, fmt.Errorf("incomplete_r2_configuration")
	}

	awsCfg, err := awscfg.LoadDefaultConfig(
		ctx,
		awscfg.WithRegion("auto"),
		awscfg.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")),
	)
	if err != nil {
		return nil, err
	}

	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
	client := s3.NewFromConfig(awsCfg, func(opts *s3.Options) {
		opts.UsePathStyle = true
		opts.EndpointResolver = s3.EndpointResolverFromURL(endpoint)
	})

	presignTTL := cfg.PresignTTL
	if presignTTL <= 0 {
		presignTTL = 15 * time.Minute
	}

	return &R2Client{
		bucket:     bucket,
		presignTTL: presignTTL,
		client:     client,
		presign:    s3.NewPresignClient(client),
	}, nil
}

func (c *R2Client) Enabled() bool {
	return c != nil && c.client != nil && c.presign != nil && strings.TrimSpace(c.bucket) != ""
}

func (c *R2Client) Bucket() string {
	if c == nil {
		return ""
	}
	return c.bucket
}

func (c *R2Client) UploadBytes(ctx context.Context, key, contentType string, body []byte, metadata map[string]string) (UploadedObject, error) {
	if !c.Enabled() {
		return UploadedObject{}, fmt.Errorf("r2_not_configured")
	}
	if strings.TrimSpace(key) == "" {
		return UploadedObject{}, fmt.Errorf("r2_object_key_required")
	}
	if len(body) == 0 {
		return UploadedObject{}, fmt.Errorf("r2_object_body_required")
	}
	if strings.TrimSpace(contentType) == "" {
		contentType = "application/octet-stream"
	}

	out, err := c.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      &c.bucket,
		Key:         &key,
		Body:        bytes.NewReader(body),
		ContentType: &contentType,
		Metadata:    sanitizeMetadata(metadata),
	})
	if err != nil {
		return UploadedObject{}, err
	}

	return UploadedObject{
		Bucket:      c.bucket,
		Key:         key,
		ETag:        strings.Trim(strings.TrimSpace(valueOrEmpty(out.ETag)), `"`),
		ContentType: contentType,
		SizeBytes:   int64(len(body)),
	}, nil
}

func (c *R2Client) DeleteObject(ctx context.Context, key string) error {
	if !c.Enabled() || strings.TrimSpace(key) == "" {
		return nil
	}
	_, err := c.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: &c.bucket,
		Key:    &key,
	})
	return err
}

func (c *R2Client) PresignGetObject(ctx context.Context, key string, ttl time.Duration) (string, error) {
	if !c.Enabled() {
		return "", fmt.Errorf("r2_not_configured")
	}
	if strings.TrimSpace(key) == "" {
		return "", fmt.Errorf("r2_object_key_required")
	}
	if ttl <= 0 {
		ttl = c.presignTTL
	}
	out, err := c.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: &c.bucket,
		Key:    &key,
	}, func(opts *s3.PresignOptions) {
		opts.Expires = ttl
	})
	if err != nil {
		return "", err
	}
	return out.URL, nil
}

func (c *R2Client) PresignPutObject(ctx context.Context, key, contentType string, ttl time.Duration, metadata map[string]string) (PresignedRequest, error) {
	if !c.Enabled() {
		return PresignedRequest{}, fmt.Errorf("r2_not_configured")
	}
	if strings.TrimSpace(key) == "" {
		return PresignedRequest{}, fmt.Errorf("r2_object_key_required")
	}
	if ttl <= 0 {
		ttl = c.presignTTL
	}

	input := &s3.PutObjectInput{
		Bucket:   &c.bucket,
		Key:      &key,
		Metadata: sanitizeMetadata(metadata),
	}
	if strings.TrimSpace(contentType) != "" {
		input.ContentType = &contentType
	}

	out, err := c.presign.PresignPutObject(ctx, input, func(opts *s3.PresignOptions) {
		opts.Expires = ttl
	})
	if err != nil {
		return PresignedRequest{}, err
	}

	headers := map[string]string{}
	copyHeader := func(key string, values []string) {
		if len(values) == 0 {
			return
		}
		trimmed := strings.TrimSpace(values[0])
		if trimmed == "" {
			return
		}
		headers[strings.ToLower(key)] = trimmed
	}
	for key, values := range out.SignedHeader {
		copyHeader(key, values)
	}
	if strings.TrimSpace(contentType) != "" {
		headers["content-type"] = contentType
	}

	return PresignedRequest{
		URL:     out.URL,
		Method:  out.Method,
		Headers: headers,
	}, nil
}

func sanitizeMetadata(input map[string]string) map[string]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]string, len(input))
	for key, value := range input {
		trimmedKey := strings.ToLower(strings.TrimSpace(key))
		trimmedValue := strings.TrimSpace(value)
		if trimmedKey == "" || trimmedValue == "" {
			continue
		}
		out[trimmedKey] = trimmedValue
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func valueOrEmpty(ptr *string) string {
	if ptr == nil {
		return ""
	}
	return *ptr
}
