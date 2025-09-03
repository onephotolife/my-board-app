import type { ClientSession } from 'mongoose';
import mongoose from 'mongoose';

/**
 * Execute a database operation with optional transaction support
 * based on environment configuration
 */
export async function executeWithOptionalTransaction<T>(
  operation: (session?: ClientSession) => Promise<T>,
  options: {
    useTransaction?: boolean;
    retryOnFailure?: boolean;
  } = {}
): Promise<T> {
  const shouldUseTransaction = 
    options.useTransaction ?? 
    process.env.MONGODB_USE_TRANSACTION === 'true';
  
  if (!shouldUseTransaction) {
    // Execute without transaction
    console.warn('[Transaction Helper] Executing without transaction (MONGODB_USE_TRANSACTION=false)');
    return await operation();
  }
  
  let session: ClientSession | null = null;
  try {
    console.warn('[Transaction Helper] Starting transaction session...');
    session = await mongoose.startSession();
    let result: T;
    
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    
    console.warn('[Transaction Helper] Transaction completed successfully');
    return result!;
  } catch (error: any) {
    console.error('[Transaction Helper] Transaction error:', error.message);
    
    if (
      options.retryOnFailure && 
      (error.message?.includes('replica set') || 
       error.message?.includes('Transaction numbers are only allowed'))
    ) {
      console.warn('[Transaction Helper] MongoDB not configured for transactions, falling back to non-transactional execution');
      return await operation();
    }
    
    throw error;
  } finally {
    if (session) {
      await session.endSession();
      console.warn('[Transaction Helper] Session ended');
    }
  }
}