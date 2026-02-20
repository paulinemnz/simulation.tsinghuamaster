import OpenAI from 'openai';
import https from 'https';
import http from 'http';
import { deepSeekCircuitBreaker } from '../utils/circuitBreaker';
import { retry } from '../utils/retry';

const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_MAX_TOKENS = 300;

const systemPrompt = [
  'You are a general-purpose reasoning assistant.',
  'You do not have access to any simulation documents, dashboards, memos, PDFs, or hidden logic.',
  'Only use the content the user provides in their message plus general world knowledge.',
  'Do not invent case facts or claim you have read internal documents.',
  'Do not predict exact simulation outcomes or claim any option is optimal.',
  'If asked what will happen with a choice, say you cannot know and discuss plausible implications only.',
  'Keep responses concise and practical.'
].join(' ');

const getClient = () => {
  // Verify we're reading DEEPSEEK_API_KEY, not OPENAI_API_KEY
  const rawApiKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const apiKey = rawApiKey?.trim();
  // DeepSeek API requires /v1 in the baseURL
  const baseURL = 'https://api.deepseek.com/v1';
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:getClient',message:'Creating DeepSeek client - VERIFYING KEY SOURCE',data:{hasDeepSeekKey:!!rawApiKey,hasOpenaiKey:!!openaiKey,usingDeepSeekKey:true,apiKeyLength:apiKey?.length,apiKeyPrefix:apiKey?.substring(0,10),apiKeySuffix:apiKey?.substring(apiKey.length-10),baseURL,envVarName:'DEEPSEEK_API_KEY',allEnvKeys:Object.keys(process.env).filter(k=>k.includes('DEEPSEEK')||k.includes('OPENAI')).join(',')},timestamp:Date.now(),runId:'verify-key-source',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set');
  }
  
  // Create HTTP agent with timeout configuration
  const httpAgent = new https.Agent({
    keepAlive: true,
    timeout: 30000, // 30 seconds for connection establishment
  });
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:getClient-config',message:'Client configuration',data:{baseURL,hasHttpAgent:!!httpAgent,timeout:60000,maxRetries:2},timestamp:Date.now(),runId:'debug-auth-v2',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  return new OpenAI({ 
    apiKey,
    baseURL,
    httpAgent,
    timeout: 60000, // 60 seconds timeout for the request
    maxRetries: 2
  });
};

const getModel = () => process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;

const getMaxTokens = () => {
  const raw = process.env.DEEPSEEK_MAX_TOKENS;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_TOKENS;
  return Number.isFinite(parsed) ? parsed : DEFAULT_MAX_TOKENS;
};

type ChatOptions = {
  maxTokens?: number;
  temperature?: number;
};

export const generateChatCompletion = async (
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: ChatOptions = {}
) => {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: getModel(),
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? getMaxTokens(),
    messages
  });

  const reply = response.choices[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error('DeepSeek returned an empty response');
  }
  return reply;
};

export const generateAssistantReply = async (userMessage: string) => {
  const startTime = Date.now();
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:generateAssistantReply-entry',message:'Starting DeepSeek API call',data:{messageLength:userMessage.length,model:getModel(),maxTokens:getMaxTokens()},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Test connectivity to DeepSeek API first
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:generateAssistantReply-connectivity-test',message:'Testing connectivity to api.deepseek.com',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
  
  try {
    // Quick connectivity test using Node's https module
    const connectivityTestStart = Date.now();
    await new Promise<void>((resolve, reject) => {
      const req = https.request('https://api.deepseek.com', { method: 'HEAD', timeout: 5000 }, (res) => {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:generateAssistantReply-connectivity-success',message:'Connectivity test succeeded',data:{timeSinceStart:Date.now()-connectivityTestStart,statusCode:res.statusCode},timestamp:Date.now(),runId:'run1',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        resolve();
      });
      req.on('error', (err: any) => {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:generateAssistantReply-connectivity-error',message:'Connectivity test failed',data:{timeSinceStart:Date.now()-connectivityTestStart,errorMessage:err?.message,errorCode:err?.code},timestamp:Date.now(),runId:'run1',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        reject(err);
      });
      req.on('timeout', () => {
        req.destroy();
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:generateAssistantReply-connectivity-timeout',message:'Connectivity test timed out',data:{timeSinceStart:Date.now()-connectivityTestStart},timestamp:Date.now(),runId:'run1',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        reject(new Error('Connectivity test timed out'));
      });
      req.setTimeout(5000);
      req.end();
    });
  } catch (connectivityError: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:generateAssistantReply-connectivity-failed',message:'Cannot reach DeepSeek API',data:{errorMessage:connectivityError?.message,errorCode:connectivityError?.code},timestamp:Date.now(),runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    throw new Error(`Cannot connect to DeepSeek API. This may be due to network issues, firewall, or proxy settings. Error: ${connectivityError?.message || 'Unknown error'}`);
  }
  
  try {
    // Use circuit breaker and retry logic for resilience
    const response = await deepSeekCircuitBreaker.execute(async () => {
      return await retry(async () => {
        const client = getClient();
        const model = getModel();
        const maxTokens = getMaxTokens();
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:generateAssistantReply-before-request',message:'About to call DeepSeek API',data:{timeSinceStart:Date.now()-startTime,model,maxTokens,baseURL:client.baseURL},timestamp:Date.now(),runId:'debug-auth-v2',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return await client.chat.completions.create({
          model,
          temperature: 0.2,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        });
      }, {
        maxRetries: 2,
        delayMs: 1000,
        shouldRetry: (error: any) => {
          // Retry on network errors and 5xx errors
          return error.code === 'ETIMEDOUT' || 
                 error.code === 'ECONNREFUSED' || 
                 error.status >= 500;
        }
      });
    });
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:generateAssistantReply-success',message:'DeepSeek API call succeeded',data:{timeSinceStart:Date.now()-startTime,hasResponse:!!response,hasChoices:!!response.choices,choicesLength:response.choices?.length},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    const reply = response.choices[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error('DeepSeek returned an empty response');
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:generateAssistantReply-reply-extracted',message:'Reply extracted successfully',data:{replyLength:reply.length,timeSinceStart:Date.now()-startTime},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return reply;
  } catch (error: any) {
    const errorTime = Date.now() - startTime;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:generateAssistantReply-error',message:'DeepSeek API call failed',data:{timeSinceStart:errorTime,errorType:error?.constructor?.name,errorMessage:error?.message,errorCode:error?.code,errorStatus:error?.status,errorResponse:error?.response?.data,errorHeaders:error?.response?.headers,errorCause:error?.cause?.code,errorCauseType:error?.cause?.type,hasCause:!!error?.cause,fullError:JSON.stringify(error,Object.getOwnPropertyNames(error))},timestamp:Date.now(),runId:'debug-auth',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // Provide more helpful error messages
    if (error?.message?.includes('API key')) {
      throw new Error('DeepSeek API key is invalid or not set. Please check your DEEPSEEK_API_KEY environment variable.');
    }
    if (error?.status === 401) {
      // #region agent log
      const requestInfo = {
        url: error?.request?.url,
        method: error?.request?.method,
        headers: error?.request?.headers,
        path: error?.request?.path,
        host: error?.request?.host,
        protocol: error?.request?.protocol
      };
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openaiClient.ts:generateAssistantReply-401',message:'401 authentication error details',data:{errorStatus:error?.status,errorResponse:error?.response?.data,errorResponseText:error?.response?.text,errorResponseBody:error?.response?.body,requestInfo,errorMessage:error?.message,errorCode:error?.code},timestamp:Date.now(),runId:'debug-auth-v2',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      throw new Error('DeepSeek API authentication failed. Please check your API key.');
    }
    if (error?.status === 429) {
      throw new Error('DeepSeek API rate limit exceeded. Please try again later.');
    }
    if (error?.status === 500 || error?.status === 503) {
      throw new Error('DeepSeek API service is temporarily unavailable. Please try again later.');
    }
    if (error?.code === 'insufficient_quota') {
      throw new Error('DeepSeek API quota exceeded. Please add credits to your DeepSeek account.');
    }
    if (error?.code === 'ETIMEDOUT' || error?.cause?.code === 'ETIMEDOUT') {
      throw new Error('Connection to DeepSeek API timed out. This may be due to network issues, firewall, or proxy settings. Please check your internet connection and try again.');
    }
    // Re-throw with original message if it's already a helpful error
    if (error?.message) {
      throw error;
    }
    throw new Error(`DeepSeek API error: ${error?.message || 'Unknown error'}`);
  }
};
