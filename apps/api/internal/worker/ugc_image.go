package worker

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"strings"
)

import (
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
)

const maxUGCReferenceLongEdge = 1024

func normalizeUGCImageDataURL(contentType string, raw []byte) string {
	normalizedType, normalizedRaw, err := normalizeUGCImageBlob(contentType, raw)
	if err != nil {
		fallbackType := strings.TrimSpace(contentType)
		if fallbackType == "" {
			fallbackType = "image/png"
		}
		return fmt.Sprintf("data:%s;base64,%s", fallbackType, base64.StdEncoding.EncodeToString(raw))
	}
	return fmt.Sprintf("data:%s;base64,%s", normalizedType, base64.StdEncoding.EncodeToString(normalizedRaw))
}

func normalizeUGCImageBlob(contentType string, raw []byte) (string, []byte, error) {
	img, format, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return "", nil, err
	}

	bounds := img.Bounds()
	targetWidth, targetHeight := scaleUGCImageDimensions(bounds.Dx(), bounds.Dy(), maxUGCReferenceLongEdge)
	if targetWidth != bounds.Dx() || targetHeight != bounds.Dy() {
		img = resizeUGCImageNearest(img, targetWidth, targetHeight)
	}

	var buf bytes.Buffer
	switch {
	case strings.EqualFold(strings.TrimSpace(contentType), "image/png"), format == "png":
		if err := png.Encode(&buf, img); err != nil {
			return "", nil, err
		}
		return "image/png", buf.Bytes(), nil
	default:
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85}); err != nil {
			return "", nil, err
		}
		return "image/jpeg", buf.Bytes(), nil
	}
}

func scaleUGCImageDimensions(width, height, maxLongEdge int) (int, int) {
	if width <= 0 || height <= 0 || maxLongEdge <= 0 {
		return width, height
	}
	longEdge := width
	if height > longEdge {
		longEdge = height
	}
	if longEdge <= maxLongEdge {
		return width, height
	}

	scale := float64(maxLongEdge) / float64(longEdge)
	targetWidth := int(float64(width) * scale)
	targetHeight := int(float64(height) * scale)
	if targetWidth < 1 {
		targetWidth = 1
	}
	if targetHeight < 1 {
		targetHeight = 1
	}
	return targetWidth, targetHeight
}

func resizeUGCImageNearest(source image.Image, targetWidth, targetHeight int) image.Image {
	if targetWidth <= 0 || targetHeight <= 0 {
		return source
	}

	bounds := source.Bounds()
	sourceWidth := bounds.Dx()
	sourceHeight := bounds.Dy()
	if sourceWidth == 0 || sourceHeight == 0 {
		return source
	}

	destination := image.NewRGBA(image.Rect(0, 0, targetWidth, targetHeight))
	for y := 0; y < targetHeight; y++ {
		sourceY := bounds.Min.Y + (y * sourceHeight / targetHeight)
		for x := 0; x < targetWidth; x++ {
			sourceX := bounds.Min.X + (x * sourceWidth / targetWidth)
			destination.Set(x, y, source.At(sourceX, sourceY))
		}
	}

	return destination
}
