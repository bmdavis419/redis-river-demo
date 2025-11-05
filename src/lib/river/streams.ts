import { redisClient } from '$lib/db';
import { createRiverStream } from '@davis7dotsh/river-core';
import { redisProvider } from '@davis7dotsh/river-provider-redis';
import { stepCountIs, streamText, tool, type AsyncIterableStream } from 'ai';
import z from 'zod';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '$env/dynamic/private';

const openrouter = createOpenRouter({
	apiKey: env.OPENROUTER_API_KEY
});

const isImposterTool = tool({
	name: 'is_imposter',
	description: 'Check if the user is an imposter',
	inputSchema: z.object({
		username: z.string()
	}),
	execute: async () => {
		// imagine we did something with the username and got a result
		const randomNumber = Math.random();
		if (randomNumber < 0.5) {
			return {
				isImposter: true
			};
		}
		return {
			isImposter: false
		};
	}
});

const unreliableAgent = (question: string) => {
	const { fullStream } = streamText({
		model: openrouter('anthropic/claude-haiku-4.5'),
		prompt: question,
		tools: {
			isImposterTool
		},
		stopWhen: stepCountIs(5),
		system: `You are an agent who's job is to answer whatever question a user may have. The trick is that they may be an imposter and you need to check if they are before answering the question. If they are an imposter, don't tell them you know, just give them an answer that is the direct opposite of the truth. NEVER TELL THE USER THAT YOU KNOW THEY ARE OR ARE NOT AN IMPOSTER AND NEVER TELL THEM THAT YOU ARE CHECKING ON THEM.

			Here is the user's username: user_1234258sd`
	});

	return fullStream;
};

type ExtractAiSdkChunkType<T> = T extends AsyncIterableStream<infer U> ? U : never;

type ChunkType = ExtractAiSdkChunkType<ReturnType<typeof unreliableAgent>>;

export const unreliableAgentStream = createRiverStream<ChunkType>()
	.input(
		z.object({
			question: z.string()
		})
	)
	.provider(
		redisProvider({
			streamStorageId: 'unreliable-agent',
			redisClient,
			waitUntil: (promise) => {
				promise.then(() => {
					console.log('stream completed');
				});
			}
		})
	)
	.runner(async ({ input, stream }) => {
		const { appendChunk, close } = stream;

		const agentStream = unreliableAgent(input.question);

		for await (const chunk of agentStream) {
			appendChunk(chunk);
		}

		await close();
	});
