const { generateText, generateObject } = require('ai');
const { openai } = require('@ai-sdk/openai');
const { z } = require('zod');

async function testAISDKv5() {
  console.log('Testing AI SDK v5 beta...');
  
  const model = openai('gpt-4o-mini');
  console.log('Model type:', typeof model);
  console.log('Model properties:', Object.keys(model));
  
  try {
    // Test generateText
    console.log('\n1. Testing generateText...');
    const textResult = await generateText({
      model,
      prompt: 'Say hello in a professional manner.',
      maxTokens: 50,
    });
    
    console.log('✅ generateText works');
    console.log('Text:', textResult.text);
    console.log('Usage:', textResult.usage);
    console.log('Response messages:', textResult.response?.messages?.length);
    
    // Test generateObject
    console.log('\n2. Testing generateObject...');
    const objectResult = await generateObject({
      model,
      schema: z.object({
        greeting: z.string(),
        professional: z.boolean(),
      }),
      prompt: 'Generate a professional greeting',
    });
    
    console.log('✅ generateObject works');
    console.log('Object:', objectResult.object);
    console.log('Usage:', objectResult.usage);
    
    // Test message structure
    console.log('\n3. Testing message structure...');
    const conversation = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hello! How can I help you today?' }
    ];
    
    const evalResult = await generateObject({
      model,
      schema: z.object({
        professional: z.boolean(),
        welcoming: z.boolean(),
      }),
      messages: conversation,
      system: 'Evaluate if this conversation is professional and welcoming.',
    });
    
    console.log('✅ Message evaluation works');
    console.log('Evaluation:', evalResult.object);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testAISDKv5().then(() => {
  console.log('\n🎉 AI SDK v5 test complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});