<script lang="ts">
	import { remoteRunAgentOnServer } from '$lib/demo.remote';
	import { myRiverClient } from '$lib/river/client';
	import { marked } from 'marked';
	import { useSearchParams } from 'runed/kit';
	import { onMount } from 'svelte';
	import z from 'zod';

	const searchParamsSchema = z.object({
		resumeKey: z.string().default('')
	});

	const params = useSearchParams(searchParamsSchema);

	const resumeKey = $derived(params.resumeKey);

	let question = $state('Is the earth really flat?');
	const trimmedQuestion = $derived(question.trim());

	let answer = $state('');
	const parsedAnswer = $derived(marked(answer, { async: false }));
	let wasImposer = $state<boolean | undefined>(undefined);

	let status = $state<'running' | 'success' | 'error' | 'aborted' | 'idle'>('idle');

	const agentCaller = myRiverClient.unreliableAgent({
		onChunk: (chunk) => {
			if (chunk.type === 'text-delta') {
				answer += chunk.text;
			} else if (chunk.type === 'tool-result') {
				if (!chunk.dynamic) {
					wasImposer = chunk.output.isImposter;
				}
			}
		},
		onStart: () => {
			status = 'running';
			console.log('starting stream');
			answer = '';
			wasImposer = false;
		},
		onSuccess: () => {
			console.log('stream ended');
			status = 'success';
		},
		onError: (error) => {
			console.error('stream error', error);
		},
		onFatalError: (error) => {
			console.error('stream fatal error', error);
			status = 'error';
		},
		onInfo: (info) => {
			if (info.encodedResumptionToken) {
				params.resumeKey = info.encodedResumptionToken;
			}
		}
	});

	onMount(() => {
		if (resumeKey) {
			agentCaller.resume(resumeKey);
		}
	});

	let isPending = $state(false);

	const handleAskOnServer = async () => {
		if (!trimmedQuestion) return;
		isPending = true;
		const result = await remoteRunAgentOnServer({
			question: trimmedQuestion
		});
		answer = result.answer;
		wasImposer = result.wasImposer;
		isPending = false;
	};

	const handleAsk = () => {
		if (!trimmedQuestion) return;
		agentCaller.start({
			question: trimmedQuestion
		});
	};

	const handleClear = () => {
		answer = '';
		wasImposer = undefined;
		params.resumeKey = '';
	};
</script>

<div class="mx-auto flex max-w-4xl flex-col gap-4 p-6">
	<textarea
		bind:value={question}
		placeholder="Enter your question..."
		class="min-h-[200px] w-full resize-none rounded-lg border border-gray-300 p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
	></textarea>

	<div class="text-sm text-gray-500">
		{#if isPending}
			(Pending){/if}
	</div>

	<div class="mt-4 flex gap-4">
		<button
			onclick={handleAskOnServer}
			class="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		>
			Ask on Server
		</button>
		<button
			onclick={handleAsk}
			class="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		>
			Ask
		</button>
		<button
			onclick={handleClear}
			class="rounded-lg bg-gray-600 px-6 py-2 text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:outline-none"
		>
			Clear Answer
		</button>
	</div>

	{#if status === 'running' && wasImposer === undefined && !parsedAnswer}
		<div class="text-sm text-gray-500">Thinking...</div>
	{/if}

	{#if parsedAnswer}
		<div>
			{#if wasImposer}
				<div class="text-red-500">
					<p>You are an imposter!</p>
				</div>
			{:else}
				<div class="text-green-500">
					<p>You are not an imposter!</p>
				</div>
			{/if}
		</div>
		<div class="mt-4">
			<div class="prose max-w-none prose-invert">{@html parsedAnswer}</div>
		</div>
	{/if}
</div>
