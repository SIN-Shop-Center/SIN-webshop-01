package worker

import (
	"context"
	"errors"
)

func ProcessQueues(ctx context.Context, store *Store, handler Handler, workerName string, batchSize int) (int, error) {
	queues := []string{"default", "automation", "ai", "social"}
	processed := 0

	for _, queueName := range queues {
		jobs, err := store.Dequeue(ctx, queueName, batchSize, workerName)
		if err != nil {
			return processed, err
		}

		for _, job := range jobs {
			err := handler.Handle(ctx, job)
			if err == nil {
				if markErr := store.MarkSucceeded(ctx, job.ID); markErr != nil {
					return processed, markErr
				}
				processed++
				continue
			}

			if errors.Is(err, ErrPermanent) {
				job.Attempt = job.MaxAttempts
			}
			if markErr := store.MarkFailed(ctx, job, err); markErr != nil {
				return processed, markErr
			}
			processed++
		}
	}

	return processed, nil
}
