import { EmailService } from './mailer';
import { MetricsService } from '../monitoring/metrics';

interface EmailJob {
  id?: string;
  type: 'verification' | 'password-reset' | 'welcome';
  to: string;
  data: any;
  priority?: 'low' | 'normal' | 'high';
  retryOptions?: {
    attempts: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
  };
}

interface QueuedJob extends EmailJob {
  id: string;
  attempts: number;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

/**
 * メールキューサービス（簡易実装）
 * 本番環境ではRedis + Bullを使用することを推奨
 */
export class EmailQueueService {
  private queue: QueuedJob[] = [];
  private processing = false;
  private emailService: EmailService;
  private metrics: MetricsService;
  
  constructor() {
    this.emailService = new EmailService();
    this.metrics = new MetricsService();
    
    // 定期的にキューを処理
    if (typeof window === 'undefined') {
      setInterval(() => this.processQueue(), 5000);
    }
  }
  
  /**
   * ジョブをキューに追加
   */
  async addJob(job: EmailJob): Promise<string> {
    const jobId = this.generateJobId();
    
    const queuedJob: QueuedJob = {
      ...job,
      id: jobId,
      attempts: 0,
      createdAt: new Date(),
      status: 'pending',
    };
    
    // 優先度に基づいて挿入位置を決定
    const priority = this.getPriorityValue(job.priority);
    let insertIndex = this.queue.length;
    
    for (let i = 0; i < this.queue.length; i++) {
      const existingPriority = this.getPriorityValue(this.queue[i].priority);
      if (priority < existingPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, queuedJob);
    
    console.log(`📧 メールジョブ追加: ${jobId}, タイプ: ${job.type}, 優先度: ${job.priority || 'normal'}`);
    this.metrics.record('email.queue.added', { type: job.type, priority: job.priority });
    
    // すぐに処理を試みる
    this.processQueue();
    
    return jobId;
  }
  
  /**
   * キューを処理
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    try {
      // ペンディングのジョブを取得
      const job = this.queue.find(j => j.status === 'pending');
      
      if (!job) {
        return;
      }
      
      job.status = 'processing';
      job.attempts++;
      
      console.log(`📮 メール送信開始: ${job.id}, タイプ: ${job.type}, 試行: ${job.attempts}`);
      
      try {
        // メール送信
        await this.sendEmail(job);
        
        // 成功
        job.status = 'completed';
        console.log(`✅ メール送信成功: ${job.id}`);
        this.metrics.record('email.sent', { type: job.type, attempt: job.attempts });
        
        // 完了したジョブを削除
        this.removeJob(job.id);
        
      } catch (error: any) {
        console.error(`❌ メール送信失敗: ${job.id}`, error);
        
        const maxAttempts = job.retryOptions?.attempts || 3;
        
        if (job.attempts >= maxAttempts) {
          // 最大試行回数に達した
          job.status = 'failed';
          job.error = error.message;
          
          console.error(`🔴 ジョブ失敗（最大試行回数到達）: ${job.id}`);
          this.metrics.record('email.failed', { 
            type: job.type, 
            attempt: job.attempts,
            error: error.message 
          });
          
          // 失敗したジョブをDLQに移動（実装簡略化のため、ここではログのみ）
          this.moveToDeadLetterQueue(job);
          
        } else {
          // リトライ
          job.status = 'pending';
          
          // バックオフ遅延を適用
          const delay = this.calculateBackoffDelay(job);
          console.log(`🔄 リトライ予定: ${job.id}, 遅延: ${delay}ms`);
          
          setTimeout(() => {
            if (this.queue.find(j => j.id === job.id)) {
              this.processQueue();
            }
          }, delay);
        }
      }
      
    } finally {
      this.processing = false;
      
      // 次のジョブを処理
      if (this.queue.some(j => j.status === 'pending')) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }
  
  /**
   * メール送信
   */
  private async sendEmail(job: QueuedJob): Promise<void> {
    switch (job.type) {
      case 'verification':
        await this.emailService.sendVerificationEmail(job.to, {
          userName: job.data.userName,
          verificationUrl: job.data.verificationUrl,
        });
        break;
        
      case 'password-reset':
        // パスワードリセットメール（未実装）
        console.log('パスワードリセットメール送信:', job.to);
        break;
        
      case 'welcome':
        // ウェルカムメール（未実装）
        console.log('ウェルカムメール送信:', job.to);
        break;
        
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }
  
  /**
   * バックオフ遅延を計算
   */
  private calculateBackoffDelay(job: QueuedJob): number {
    const backoff = job.retryOptions?.backoff;
    
    if (!backoff) {
      return 5000; // デフォルト5秒
    }
    
    if (backoff.type === 'exponential') {
      return backoff.delay * Math.pow(2, job.attempts - 1);
    }
    
    return backoff.delay;
  }
  
  /**
   * デッドレターキューへの移動（簡易実装）
   */
  private moveToDeadLetterQueue(job: QueuedJob): void {
    console.log(`🔴 DLQに移動: ${job.id}`);
    
    // 実際の実装では、別のストレージに保存
    // ここでは簡略化のため、キューから削除のみ
    this.removeJob(job.id);
    
    this.metrics.record('email.dlq', { 
      type: job.type,
      error: job.error,
    });
  }
  
  /**
   * ジョブを削除
   */
  private removeJob(jobId: string): void {
    const index = this.queue.findIndex(j => j.id === jobId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }
  
  /**
   * ジョブIDを生成
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 優先度の数値変換
   */
  private getPriorityValue(priority?: string): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'normal':
        return 5;
      case 'low':
        return 10;
      default:
        return 5;
    }
  }
  
  /**
   * キューの統計情報
   */
  getQueueStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: this.queue.length,
    };
    
    this.queue.forEach(job => {
      stats[job.status]++;
    });
    
    return stats;
  }
  
  /**
   * キューのクリーンアップ
   */
  cleanup(): void {
    // 完了したジョブを削除
    this.queue = this.queue.filter(j => 
      j.status !== 'completed' && j.status !== 'failed'
    );
    
    console.log(`🧹 キュークリーンアップ完了: ${this.queue.length}件のジョブが残っています`);
  }
}