#!/usr/bin/env python3

"""
DMARCレポート受信確認・自動処理ツール
メールボックスからDMARCレポートを取得し、自動的に解析
"""

import os
import sys
import imaplib
import email
import gzip
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import json
import argparse
import tempfile
import shutil

class DMARCReportChecker:
    def __init__(self, config: Dict):
        self.config = config
        self.reports_dir = config.get('reports_dir', 'dmarc-reports')
        self.processed_dir = os.path.join(self.reports_dir, 'processed')
        self.stats = {
            'total_reports': 0,
            'new_reports': 0,
            'processed_reports': 0,
            'failed_reports': 0,
            'senders': {},
            'date_range': {'earliest': None, 'latest': None}
        }
        
        # ディレクトリ作成
        os.makedirs(self.reports_dir, exist_ok=True)
        os.makedirs(self.processed_dir, exist_ok=True)
    
    def check_local_reports(self) -> List[str]:
        """ローカルディレクトリのレポートをチェック"""
        report_files = []
        
        for root, dirs, files in os.walk(self.reports_dir):
            # processedディレクトリはスキップ
            if 'processed' in root:
                continue
                
            for file in files:
                if file.endswith(('.xml', '.xml.gz', '.zip')):
                    filepath = os.path.join(root, file)
                    report_files.append(filepath)
                    self.stats['total_reports'] += 1
        
        return report_files
    
    def extract_report(self, filepath: str) -> str:
        """圧縮されたレポートを展開"""
        content = None
        
        try:
            if filepath.endswith('.gz'):
                with gzip.open(filepath, 'rt', encoding='utf-8') as f:
                    content = f.read()
            elif filepath.endswith('.zip'):
                with zipfile.ZipFile(filepath, 'r') as z:
                    for name in z.namelist():
                        if name.endswith('.xml'):
                            content = z.read(name).decode('utf-8')
                            break
            else:  # Plain XML
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
        except Exception as e:
            print(f"エラー: {filepath} の展開に失敗: {e}")
            self.stats['failed_reports'] += 1
        
        return content
    
    def parse_report_metadata(self, xml_content: str) -> Dict:
        """XMLレポートからメタデータを抽出"""
        metadata = {
            'org_name': None,
            'email': None,
            'report_id': None,
            'date_begin': None,
            'date_end': None,
            'domain': None,
            'policy': None,
            'total_messages': 0,
            'pass_count': 0,
            'fail_count': 0
        }
        
        try:
            root = ET.fromstring(xml_content)
            
            # メタデータセクション
            report_metadata = root.find('report_metadata')
            if report_metadata is not None:
                org_name = report_metadata.find('org_name')
                if org_name is not None:
                    metadata['org_name'] = org_name.text
                
                email_elem = report_metadata.find('email')
                if email_elem is not None:
                    metadata['email'] = email_elem.text
                
                report_id = report_metadata.find('report_id')
                if report_id is not None:
                    metadata['report_id'] = report_id.text
                
                date_range = report_metadata.find('date_range')
                if date_range is not None:
                    begin = date_range.find('begin')
                    end = date_range.find('end')
                    if begin is not None:
                        metadata['date_begin'] = int(begin.text)
                    if end is not None:
                        metadata['date_end'] = int(end.text)
            
            # ポリシー情報
            policy = root.find('policy_published')
            if policy is not None:
                domain = policy.find('domain')
                if domain is not None:
                    metadata['domain'] = domain.text
                
                p = policy.find('p')
                if p is not None:
                    metadata['policy'] = p.text
            
            # レコード統計
            for record in root.findall('record'):
                row = record.find('row')
                if row is not None:
                    count = row.find('count')
                    if count is not None:
                        count_val = int(count.text)
                        metadata['total_messages'] += count_val
                        
                        policy_evaluated = row.find('policy_evaluated')
                        if policy_evaluated is not None:
                            dkim = policy_evaluated.find('dkim')
                            spf = policy_evaluated.find('spf')
                            
                            if dkim is not None and spf is not None:
                                if dkim.text == 'pass' and spf.text == 'pass':
                                    metadata['pass_count'] += count_val
                                else:
                                    metadata['fail_count'] += count_val
            
        except ET.ParseError as e:
            print(f"XMLパースエラー: {e}")
        
        return metadata
    
    def analyze_reports(self, report_files: List[str]) -> None:
        """レポートを分析"""
        print("\n📊 レポート分析")
        print("=" * 60)
        
        for filepath in report_files:
            print(f"\n📄 処理中: {os.path.basename(filepath)}")
            
            # レポート展開
            content = self.extract_report(filepath)
            if not content:
                continue
            
            # メタデータ解析
            metadata = self.parse_report_metadata(content)
            
            if metadata['org_name']:
                # 送信元統計
                sender = metadata['org_name']
                if sender not in self.stats['senders']:
                    self.stats['senders'][sender] = {
                        'count': 0,
                        'messages': 0,
                        'pass': 0,
                        'fail': 0
                    }
                
                self.stats['senders'][sender]['count'] += 1
                self.stats['senders'][sender]['messages'] += metadata['total_messages']
                self.stats['senders'][sender]['pass'] += metadata['pass_count']
                self.stats['senders'][sender]['fail'] += metadata['fail_count']
                
                # 日付範囲更新
                if metadata['date_begin']:
                    date_begin = datetime.fromtimestamp(metadata['date_begin'])
                    if not self.stats['date_range']['earliest'] or \
                       date_begin < self.stats['date_range']['earliest']:
                        self.stats['date_range']['earliest'] = date_begin
                
                if metadata['date_end']:
                    date_end = datetime.fromtimestamp(metadata['date_end'])
                    if not self.stats['date_range']['latest'] or \
                       date_end > self.stats['date_range']['latest']:
                        self.stats['date_range']['latest'] = date_end
                
                # レポート詳細表示
                print(f"  📍 送信元: {metadata['org_name']}")
                print(f"  📅 期間: {datetime.fromtimestamp(metadata['date_begin']).strftime('%Y-%m-%d')} - "
                      f"{datetime.fromtimestamp(metadata['date_end']).strftime('%Y-%m-%d')}")
                print(f"  📧 メッセージ数: {metadata['total_messages']:,}")
                print(f"  ✅ 認証成功: {metadata['pass_count']:,}")
                print(f"  ❌ 認証失敗: {metadata['fail_count']:,}")
                
                if metadata['total_messages'] > 0:
                    pass_rate = (metadata['pass_count'] / metadata['total_messages']) * 100
                    print(f"  📈 成功率: {pass_rate:.1f}%")
                
                self.stats['processed_reports'] += 1
            
            # 処理済みディレクトリへ移動（オプション）
            # shutil.move(filepath, os.path.join(self.processed_dir, os.path.basename(filepath)))
    
    def generate_summary(self) -> str:
        """サマリーレポートを生成"""
        report = []
        report.append("\n" + "=" * 70)
        report.append("📊 DMARCレポート受信状況サマリー")
        report.append("=" * 70)
        report.append("")
        
        # 基本統計
        report.append("【レポート統計】")
        report.append(f"総レポート数: {self.stats['total_reports']}")
        report.append(f"処理済み: {self.stats['processed_reports']}")
        report.append(f"処理失敗: {self.stats['failed_reports']}")
        report.append("")
        
        # 期間
        if self.stats['date_range']['earliest'] and self.stats['date_range']['latest']:
            report.append("【データ期間】")
            report.append(f"最古: {self.stats['date_range']['earliest'].strftime('%Y-%m-%d %H:%M')}")
            report.append(f"最新: {self.stats['date_range']['latest'].strftime('%Y-%m-%d %H:%M')}")
            
            # 期間計算
            days_covered = (self.stats['date_range']['latest'] - 
                          self.stats['date_range']['earliest']).days + 1
            report.append(f"カバー期間: {days_covered}日間")
            report.append("")
        
        # 送信元別統計
        if self.stats['senders']:
            report.append("【送信元別統計】")
            report.append("-" * 60)
            report.append(f"{'送信元':<25} {'レポート':>8} {'メール数':>10} {'成功率':>8}")
            report.append("-" * 60)
            
            for sender, data in sorted(self.stats['senders'].items(), 
                                      key=lambda x: x[1]['messages'], 
                                      reverse=True):
                if data['messages'] > 0:
                    pass_rate = (data['pass'] / data['messages']) * 100
                else:
                    pass_rate = 0
                
                sender_display = sender[:23] + ".." if len(sender) > 25 else sender
                report.append(f"{sender_display:<25} {data['count']:>8} "
                            f"{data['messages']:>10,} {pass_rate:>7.1f}%")
            
            report.append("-" * 60)
            
            # 総計
            total_messages = sum(s['messages'] for s in self.stats['senders'].values())
            total_pass = sum(s['pass'] for s in self.stats['senders'].values())
            total_fail = sum(s['fail'] for s in self.stats['senders'].values())
            
            if total_messages > 0:
                overall_pass_rate = (total_pass / total_messages) * 100
            else:
                overall_pass_rate = 0
            
            report.append(f"{'総計':<25} {self.stats['total_reports']:>8} "
                        f"{total_messages:>10,} {overall_pass_rate:>7.1f}%")
            report.append("")
            
            # 評価
            report.append("【総合評価】")
            if overall_pass_rate >= 99:
                report.append("✅ 認証率99%以上 - Phase 5 (reject) への移行を検討可能")
            elif overall_pass_rate >= 95:
                report.append("✅ 認証率95%以上 - 次のフェーズへの移行を検討可能")
            elif overall_pass_rate >= 90:
                report.append("⚠️  認証率90%以上 - 改善の余地あり")
            else:
                report.append("❌ 認証率90%未満 - 問題の調査と修正が必要")
        else:
            report.append("レポートが見つかりませんでした。")
            report.append("")
            report.append("【確認事項】")
            report.append("1. DMARCレコードが正しく設定されているか")
            report.append("2. レポート用メールアドレスが有効か")
            report.append("3. 24-48時間経過しているか")
        
        report.append("")
        report.append("=" * 70)
        
        return '\n'.join(report)
    
    def check_recent_reports(self, days: int = 7) -> None:
        """最近のレポートをチェック"""
        print(f"\n🔍 過去{days}日間のレポートを確認中...")
        
        cutoff_date = datetime.now() - timedelta(days=days)
        recent_count = 0
        
        for filepath in self.check_local_reports():
            # ファイルの更新日時を確認
            mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
            if mtime >= cutoff_date:
                recent_count += 1
        
        if recent_count > 0:
            print(f"✅ {recent_count}個の新しいレポートが見つかりました")
        else:
            print(f"⚠️  過去{days}日間の新しいレポートはありません")
            print("\n【トラブルシューティング】")
            print("1. メールボックスを確認してください")
            print("2. スパムフォルダも確認してください")
            print("3. DMARCレコードのruaアドレスを確認してください")

def main():
    parser = argparse.ArgumentParser(description='DMARCレポート受信確認ツール')
    parser.add_argument('--dir', default='dmarc-reports', 
                       help='レポートディレクトリ（デフォルト: dmarc-reports）')
    parser.add_argument('--days', type=int, default=7,
                       help='確認する日数（デフォルト: 7）')
    parser.add_argument('--json', action='store_true',
                       help='JSON形式で出力')
    parser.add_argument('--save', help='結果をファイルに保存')
    
    args = parser.parse_args()
    
    # 設定
    config = {
        'reports_dir': args.dir
    }
    
    # チェッカー初期化
    checker = DMARCReportChecker(config)
    
    print("=" * 70)
    print("🔍 DMARCレポート受信確認ツール")
    print("=" * 70)
    print(f"レポートディレクトリ: {args.dir}")
    print(f"確認期間: 過去{args.days}日間")
    
    # 最近のレポート確認
    checker.check_recent_reports(args.days)
    
    # レポート分析
    report_files = checker.check_local_reports()
    if report_files:
        checker.analyze_reports(report_files)
    
    # サマリー生成
    summary = checker.generate_summary()
    
    if args.json:
        # JSON出力
        json_output = {
            'stats': checker.stats,
            'timestamp': datetime.now().isoformat()
        }
        # datetime オブジェクトを文字列に変換
        if checker.stats['date_range']['earliest']:
            json_output['stats']['date_range']['earliest'] = \
                checker.stats['date_range']['earliest'].isoformat()
        if checker.stats['date_range']['latest']:
            json_output['stats']['date_range']['latest'] = \
                checker.stats['date_range']['latest'].isoformat()
        
        print("\n" + json.dumps(json_output, indent=2, ensure_ascii=False))
    else:
        print(summary)
    
    # ファイル保存
    if args.save:
        with open(args.save, 'w', encoding='utf-8') as f:
            f.write(summary)
            if args.json:
                f.write("\n\n--- JSON ---\n")
                f.write(json.dumps(json_output, indent=2, ensure_ascii=False))
        print(f"\n結果を {args.save} に保存しました")

if __name__ == "__main__":
    main()