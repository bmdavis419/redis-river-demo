import { command, getRequestEvent } from '$app/server';
import z from 'zod';
import { myServerCaller } from './river/serverCaller';
import { error } from '@sveltejs/kit';

export const remoteRunAgentOnServer = command(
	z.object({
		question: z.string()
	}),
	async ({ question }) => {
		const event = getRequestEvent();
		const agentResult = await myServerCaller.unreliableAgent.start({
			input: { question },
			adapterRequest: {
				event
			}
		});

		if (agentResult.isErr()) {
			console.error('error running agent', agentResult.error);
			return error(500, agentResult.error);
		}

		let answer = '';
		let wasImposer = false;

		for await (const entry of agentResult.value) {
			if (entry.type === 'special' || entry.type === 'aborted') continue;
			const { chunk } = entry;

			if (chunk.type === 'text-delta') {
				answer += chunk.text;
			}

			if (chunk.type === 'tool-result') {
				if (!chunk.dynamic) {
					wasImposer = chunk.output.isImposter;
				}
			}
		}

		return {
			answer,
			wasImposer
		};
	}
);
