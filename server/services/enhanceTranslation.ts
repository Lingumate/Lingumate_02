/**
 * @fileOverview Enhances translated text for politeness and cultural nuance using Google Gemini 2.0 Flash.
 */

import {ai} from './genkit';
import {z} from 'genkit';

const EnhanceTranslationInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  targetLanguage: z.string().describe('The target language of the translation.'),
  sourceLanguage: z.string().optional().describe('The source language of the text.'),
  culturalContext: z.string().optional().describe('Optional cultural context for the translation.'),
});
export type EnhanceTranslationInput = z.infer<typeof EnhanceTranslationInputSchema>;

const EnhanceTranslationOutputSchema = z.object({
  translatedText: z.string().describe('The translated and enhanced text.'),
  originalText: z.string().describe('The original text.'),
  originalLanguage: z.string().describe('The original language.'),
  targetLanguage: z.string().describe('The target language.'),
});
export type EnhanceTranslationOutput = z.infer<typeof EnhanceTranslationOutputSchema>;

export async function enhanceTranslation(input: EnhanceTranslationInput): Promise<EnhanceTranslationOutput> {
  return enhanceTranslationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'enhanceTranslationPrompt',
  input: {schema: EnhanceTranslationInputSchema},
  output: {schema: EnhanceTranslationOutputSchema},
  prompt: `You are a professional translator. Your task is to translate the given text into {{{targetLanguage}}}.
If cultural context is provided, adapt the translation to be polite, respectful, and appropriate for that context.
Ensure the translation sounds natural and maintains the original meaning.

Original Text: {{{text}}}
{{#if sourceLanguage}}
Source Language: {{{sourceLanguage}}}
{{/if}}
{{#if culturalContext}}
Cultural Context: {{{culturalContext}}}
{{/if}}

Please translate the text to {{{targetLanguage}}}:`,
});

const enhanceTranslationFlow = ai.defineFlow(
  {
    name: 'enhanceTranslationFlow',
    inputSchema: EnhanceTranslationInputSchema,
    outputSchema: EnhanceTranslationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      translatedText: output!.translatedText,
      originalText: input.text,
      originalLanguage: input.sourceLanguage || 'auto',
      targetLanguage: input.targetLanguage,
    };
  }
);
