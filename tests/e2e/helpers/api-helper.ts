export interface ResendResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
}

export interface ResponseTimeStats {
  average: number;
  min: number;
  max: number;
  stdDev: number;
  times: number[];
}

export class APIHelper {
  private baseUrl: string;
  
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.TEST_BASE_URL || 'http://localhost:3000';
  }
  
  async sendResendRequest(
    email: string, 
    options: {
      reason?: string;
      headers?: Record<string, string>;
      body?: Record<string, any>;
    } = {}
  ): Promise<ResendResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Playwright E2E Test',
        ...options.headers
      },
      body: JSON.stringify({
        email,
        reason: options.reason || 'not_received',
        ...options.body
      })
    });
    
    const data = await response.json();
    
    return {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  }
  
  async sendResendRequestWithTiming(
    email: string,
    options: any = {}
  ): Promise<{ response: ResendResponse; duration: number }> {
    const start = performance.now();
    const response = await this.sendResendRequest(email, options);
    const duration = performance.now() - start;
    
    return { response, duration };
  }
  
  async measureResponseTime(
    email: string, 
    iterations: number = 10
  ): Promise<ResponseTimeStats> {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.sendResendRequest(email);
      const end = performance.now();
      times.push(end - start);
      
      // Avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const average = times.reduce((a, b) => a + b, 0) / times.length;
    const stdDev = this.calculateStdDev(times, average);
    
    return {
      average,
      min: Math.min(...times),
      max: Math.max(...times),
      stdDev,
      times
    };
  }
  
  async testRateLimit(
    email: string,
    rapidRequests: number = 5
  ): Promise<{
    triggered: boolean;
    afterRequests: number;
    cooldownSeconds?: number;
  }> {
    let triggered = false;
    let afterRequests = 0;
    let cooldownSeconds: number | undefined;
    
    for (let i = 1; i <= rapidRequests; i++) {
      const response = await this.sendResendRequest(email);
      
      if (response.status === 429) {
        triggered = true;
        afterRequests = i;
        cooldownSeconds = response.data?.error?.details?.cooldownSeconds;
        break;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return { triggered, afterRequests, cooldownSeconds };
  }
  
  async testMaxAttempts(
    email: string
  ): Promise<{
    limitReached: boolean;
    afterAttempts: number;
    errorCode?: string;
  }> {
    let limitReached = false;
    let afterAttempts = 0;
    let errorCode: string | undefined;
    
    // Try up to 7 attempts (should fail at 5)
    for (let i = 1; i <= 7; i++) {
      const response = await this.sendResendRequest(email);
      
      if (response.status === 429 && 
          response.data?.error?.code === 'MAX_ATTEMPTS_EXCEEDED') {
        limitReached = true;
        afterAttempts = i;
        errorCode = response.data.error.code;
        break;
      }
      
      // If rate limited (not max attempts), wait
      if (response.status === 429) {
        const cooldown = response.data?.error?.details?.cooldownSeconds || 1;
        await new Promise(resolve => setTimeout(resolve, cooldown * 1000 + 100));
      } else {
        // Small delay between successful requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return { limitReached, afterAttempts, errorCode };
  }
  
  async testInputValidation(
    invalidInputs: Array<{ email: string; expectedError?: string }>
  ): Promise<{
    allBlocked: boolean;
    results: Array<{ input: string; blocked: boolean; error?: string }>
  }> {
    const results = [];
    
    for (const { email, expectedError } of invalidInputs) {
      try {
        const response = await this.sendResendRequest(email);
        const blocked = response.status === 400;
        const error = response.data?.error?.message;
        
        results.push({
          input: email,
          blocked,
          error
        });
        
        if (expectedError && error !== expectedError) {
          console.warn(`Expected error "${expectedError}" but got "${error}"`);
        }
      } catch (err) {
        results.push({
          input: email,
          blocked: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    
    const allBlocked = results.every(r => r.blocked);
    return { allBlocked, results };
  }
  
  async testBackoffProgression(
    email: string
  ): Promise<number[]> {
    const cooldowns: number[] = [];
    
    for (let i = 1; i <= 5; i++) {
      const response = await this.sendResendRequest(email);
      
      if (response.status === 200) {
        const cooldown = response.data?.data?.cooldownSeconds;
        if (cooldown) {
          cooldowns.push(cooldown);
        }
      }
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return cooldowns;
  }
  
  private calculateStdDev(values: number[], mean: number): number {
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }
}