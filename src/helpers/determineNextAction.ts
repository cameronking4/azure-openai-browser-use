import { useAppState } from '../state/store';
import { availableActions } from './availableActions';
import { ParsedResponseSuccess } from './parseResponse';
import { AzureOpenAI } from 'openai';

const formattedActions = availableActions
  .map((action, i) => {
    const args = action.args
      .map((arg) => `${arg.name}: ${arg.type}`)
      .join(', ');
    return `${i + 1}. ${action.name}(${args}): ${action.description}`;
  })
  .join('\n');

const systemMessage = `
You are a browser automation assistant.

You can use the following tools:

${formattedActions}

You will be be given a task to perform and the current state of the DOM. You will also be given previous actions that you have taken. You may retry a failed action up to one time.

This is an example of an action:

<Thought>I should click the add to cart button</Thought>
<Action>click(223)</Action>

You must always include the <Thought> and <Action> open/close tags or else your response will be marked as invalid.`;

export async function determineNextAction(
  taskInstructions: string,
  previousActions: ParsedResponseSuccess[],
  simplifiedDOM: string,
  maxAttempts = 3,
  notifyError?: (error: string) => void
) {
  const model = useAppState.getState().settings.selectedModel;
  const prompt = formatPrompt(taskInstructions, previousActions, simplifiedDOM);
  const openAIKey = useAppState.getState().settings.openAIKey;

  if (!openAIKey) {
    notifyError?.('No OpenAI key found');
    return null;
  }

  const openai = new AzureOpenAI({
    baseURL:
      process.env.AZURE_OPENAI_BASE_URL ??
      'https://azure-openai-demo.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview',
    apiKey: process.env.AZURE_OPENAI_API_KEY ?? openAIKey,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-08-01-preview',
    dangerouslyAllowBrowser: true,
  });

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: 5000,
        reasoning_effort: model === 'o1' ? 'low' : undefined,
        temperature: model === 'o1' ? undefined : 0,
        stop: ['</Action>'],
      });

      return {
        usage: completion.usage,
        prompt,
        response: completion.choices[0].message?.content?.trim() + '</Action>',
      };
    } catch (error: unknown) {
      console.log('determineNextAction error', error);
      if (error instanceof Error && error.message.includes('server error')) {
        // Problem with the OpenAI API, try again
        if (notifyError) {
          notifyError(error.message);
        }
      } else {
        // Another error, give up
        throw new Error(error instanceof Error ? error.message : String(error));
      }
    }
  }
  throw new Error(
    `Failed to complete query after ${maxAttempts} attempts. Please try again later.`
  );
}

export function formatPrompt(
  taskInstructions: string,
  previousActions: ParsedResponseSuccess[],
  pageContents: string
) {
  let previousActionsString = '';

  if (previousActions.length > 0) {
    const serializedActions = previousActions
      .map(
        (action) =>
          `<Thought>${action.thought}</Thought>\n<Action>${action.action}</Action>`
      )
      .join('\n\n');
    previousActionsString = `You have already taken the following actions: \n${serializedActions}\n\n`;
  }

  return `The user requests the following task:

${taskInstructions}

${previousActionsString}

Current time: ${new Date().toLocaleString()}

Current page contents:
${pageContents}`;
}
