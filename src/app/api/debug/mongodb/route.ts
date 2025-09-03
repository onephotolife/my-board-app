import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

import { connectDB, checkDBHealth } from '@/lib/db/mongodb-local';

// MongoDB詳細診断エンドポイント
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    console.warn('🔍 [MongoDB診断] 開始');
    
    // 基本環境変数情報
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_exists: !!process.env.MONGODB_URI,
      MONGODB_URI_PRODUCTION_exists: !!process.env.MONGODB_URI_PRODUCTION,
      MONGODB_ENV: process.env.MONGODB_ENV,
      AUTH_SECRET_exists: !!process.env.AUTH_SECRET,
      NEXTAUTH_SECRET_exists: !!process.env.NEXTAUTH_SECRET,
    };
    
    console.warn('📋 [環境変数]:', envInfo);
    
    // 接続テスト
    let connectionResult = {
      success: false,
      error: null as any,
      duration: 0,
      connectionInfo: null as any
    };
    
    try {
      console.warn('🔄 [MongoDB] 接続テスト開始...');
      const conn = await connectDB();
      const connectTime = Date.now() - startTime;
      
      // 接続詳細情報
      connectionResult = {
        success: true,
        error: null,
        duration: connectTime,
        connectionInfo: {
          readyState: conn.connection.readyState,
          database: conn.connection.db?.databaseName,
          host: conn.connection.host,
          port: conn.connection.port,
          name: conn.connection.name
        }
      };
      
      console.warn('✅ [MongoDB] 接続成功:', connectionResult);
      
    } catch (error) {
      const connectTime = Date.now() - startTime;
      connectionResult = {
        success: false,
        error: {
          name: error instanceof Error ? error.constructor.name : 'UnknownError',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined
        },
        duration: connectTime,
        connectionInfo: null
      };
      
      console.error('❌ [MongoDB] 接続失敗:', connectionResult);
    }
    
    // ヘルスチェック
    let healthResult = {
      healthy: false,
      error: null as any,
      duration: 0
    };
    
    try {
      const healthStartTime = Date.now();
      const isHealthy = await checkDBHealth();
      healthResult = {
        healthy: isHealthy,
        error: null,
        duration: Date.now() - healthStartTime
      };
    } catch (error) {
      healthResult = {
        healthy: false,
        error: {
          name: error instanceof Error ? error.constructor.name : 'UnknownError',
          message: error instanceof Error ? error.message : String(error)
        },
        duration: Date.now() - startTime
      };
    }
    
    // Mongooseの状態
    const mongooseState = {
      connections: mongoose.connections.length,
      defaultConnectionState: mongoose.connection.readyState,
      states: {
        0: 'disconnected',
        1: 'connected', 
        2: 'connecting',
        3: 'disconnecting'
      }
    };
    
    const result = {
      timestamp: new Date().toISOString(),
      environment: envInfo,
      connection: connectionResult,
      health: healthResult,
      mongoose: mongooseState,
      totalDuration: Date.now() - startTime
    };
    
    console.warn('📊 [診断完了]:', result);
    
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('❌ [MongoDB診断エラー]:', error);
    return NextResponse.json(
      { 
        error: 'MongoDB診断に失敗しました',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}