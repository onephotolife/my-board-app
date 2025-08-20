// お問い合わせページのメタデータ
export const contactMetadata = {
  // 最終更新日時（このファイルを更新することで日時が変更される）
  lastUpdated: new Date().toISOString(),
  
  // 制定日（固定）
  establishedDate: '2025-01-14',
  
  // バージョン管理
  version: '1.0.0',
  
  // 更新履歴
  changeLog: [
    {
      date: '2025-01-14',
      version: '1.0.0',
      description: '初版作成'
    }
  ],
  
  // お問い合わせフォームの設定
  formConfig: {
    maxMessageLength: 2000,
    categories: [
      'サービスについて',
      '不具合報告',
      'ご要望・ご提案',
      'アカウントについて',
      'その他'
    ]
  }
};