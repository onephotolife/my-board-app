#!/usr/bin/env python3

"""
DMARCレポート分析ツール
XML形式のDMARC集約レポートを解析し、わかりやすいレポートを生成
"""

import sys
import os
import xml.etree.ElementTree as ET
import gzip
import zipfile
from datetime import datetime
from collections import defaultdict
import json
import argparse
from typing import Dict, List, Tuple
import socket

class DMARCReportAnalyzer:
    def __init__(self):
        self.reports = []
        self.summary = {
            'total_messages': 0,
            'pass_count': 0,
            'fail_count': 0,
            'sources': defaultdict(lambda: {
                'count': 0,
                'spf_pass': 0,
                'dkim_pass': 0,
                'both_pass': 0,
                'hostname': None
            }),
            'failures': [],
            'date_range': {'begin': None, 'end': None}
        }
    
    def load_report(self, filepath: str) -> None:
        """DMARCレポートファイルを読み込む"""
        content = None
        
        # ファイル形式に応じて解凍
        if filepath.endswith('.gz'):
            with gzip.open(filepath, 'rt', encoding='utf-8') as f:
                content = f.read()
        elif filepath.endswith('.zip'):
            with zipfile.ZipFile(filepath, 'r') as z:
                # ZIP内の最初のXMLファイルを読む
                for name in z.namelist():
                    if name.endswith('.xml'):
                        content = z.read(name).decode('utf-8')
                        break
        else:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        
        if content:
            self._parse_xml_report(content)
    
    def _parse_xml_report(self, xml_content: str) -> None:
        """XMLレポートを解析"""
        try:
            root = ET.fromstring(xml_content)
            
            # メタデータ取得
            metadata = root.find('report_metadata')
            if metadata is not None:
                date_range = metadata.find('date_range')
                if date_range is not None:
                    begin = date_range.find('begin')
                    end = date_range.find('end')
                    if begin is not None:
                        self.summary['date_range']['begin'] = int(begin.text)
                    if end is not None:
                        self.summary['date_range']['end'] = int(end.text)
            
            # ポリシー情報取得
            policy = root.find('policy_published')
            policy_info = {}
            if policy is not None:
                policy_info = {
                    'domain': policy.find('domain').text if policy.find('domain') is not None else '',
                    'p': policy.find('p').text if policy.find('p') is not None else '',
                    'sp': policy.find('sp').text if policy.find('sp') is not None else '',
                    'adkim': policy.find('adkim').text if policy.find('adkim') is not None else '',
                    'aspf': policy.find('aspf').text if policy.find('aspf') is not None else '',
                }
            
            # レコード解析
            for record in root.findall('record'):
                row = record.find('row')
                if row is None:
                    continue
                
                source_ip = row.find('source_ip').text if row.find('source_ip') is not None else ''
                count = int(row.find('count').text) if row.find('count') is not None else 0
                
                policy_evaluated = row.find('policy_evaluated')
                if policy_evaluated is None:
                    continue
                
                disposition = policy_evaluated.find('disposition').text if policy_evaluated.find('disposition') is not None else ''
                
                # DKIM結果
                dkim_result = 'fail'
                dkim_elem = policy_evaluated.find('dkim')
                if dkim_elem is not None:
                    dkim_result = dkim_elem.text
                
                # SPF結果
                spf_result = 'fail'
                spf_elem = policy_evaluated.find('spf')
                if spf_elem is not None:
                    spf_result = spf_elem.text
                
                # 統計更新
                self.summary['total_messages'] += count
                
                # IPアドレスの逆引き
                hostname = self._get_hostname(source_ip)
                self.summary['sources'][source_ip]['hostname'] = hostname
                self.summary['sources'][source_ip]['count'] += count
                
                if spf_result == 'pass':
                    self.summary['sources'][source_ip]['spf_pass'] += count
                
                if dkim_result == 'pass':
                    self.summary['sources'][source_ip]['dkim_pass'] += count
                
                if spf_result == 'pass' and dkim_result == 'pass':
                    self.summary['sources'][source_ip]['both_pass'] += count
                    self.summary['pass_count'] += count
                else:
                    self.summary['fail_count'] += count
                    
                    # 失敗の詳細記録
                    failure = {
                        'source_ip': source_ip,
                        'hostname': hostname,
                        'count': count,
                        'spf': spf_result,
                        'dkim': dkim_result,
                        'disposition': disposition
                    }
                    self.summary['failures'].append(failure)
            
            # レポート情報を保存
            self.reports.append({
                'metadata': metadata,
                'policy': policy_info,
                'summary': dict(self.summary)
            })
            
        except ET.ParseError as e:
            print(f"XMLパースエラー: {e}", file=sys.stderr)
    
    def _get_hostname(self, ip: str) -> str:
        """IPアドレスから逆引きホスト名を取得"""
        try:
            hostname = socket.gethostbyaddr(ip)[0]
            return hostname
        except:
            return ip
    
    def generate_report(self) -> str:
        """分析レポートを生成"""
        report = []
        report.append("=" * 70)
        report.append("DMARC集約レポート分析結果")
        report.append("=" * 70)
        report.append("")
        
        # 期間
        if self.summary['date_range']['begin']:
            begin = datetime.fromtimestamp(self.summary['date_range']['begin'])
            end = datetime.fromtimestamp(self.summary['date_range']['end'])
            report.append(f"レポート期間: {begin.strftime('%Y-%m-%d %H:%M')} ～ {end.strftime('%Y-%m-%d %H:%M')}")
            report.append("")
        
        # サマリー
        report.append("【全体サマリー】")
        report.append("-" * 40)
        total = self.summary['total_messages']
        pass_count = self.summary['pass_count']
        fail_count = self.summary['fail_count']
        
        if total > 0:
            pass_rate = (pass_count / total) * 100
            fail_rate = (fail_count / total) * 100
        else:
            pass_rate = fail_rate = 0
        
        report.append(f"総メール数: {total:,}")
        report.append(f"認証成功: {pass_count:,} ({pass_rate:.1f}%)")
        report.append(f"認証失敗: {fail_count:,} ({fail_rate:.1f}%)")
        report.append("")
        
        # 送信元別統計
        report.append("【送信元別統計】")
        report.append("-" * 40)
        
        # ソート（メール数の多い順）
        sorted_sources = sorted(
            self.summary['sources'].items(),
            key=lambda x: x[1]['count'],
            reverse=True
        )
        
        report.append(f"{'IP/ホスト名':<40} {'数量':>8} {'SPF':>6} {'DKIM':>6} {'両方':>6}")
        report.append("-" * 68)
        
        for ip, stats in sorted_sources[:20]:  # 上位20件
            hostname = stats['hostname'] if stats['hostname'] != ip else ip
            if len(hostname) > 38:
                hostname = hostname[:35] + "..."
            
            spf_rate = (stats['spf_pass'] / stats['count'] * 100) if stats['count'] > 0 else 0
            dkim_rate = (stats['dkim_pass'] / stats['count'] * 100) if stats['count'] > 0 else 0
            both_rate = (stats['both_pass'] / stats['count'] * 100) if stats['count'] > 0 else 0
            
            report.append(
                f"{hostname:<40} {stats['count']:>8,} "
                f"{spf_rate:>5.1f}% {dkim_rate:>5.1f}% {both_rate:>5.1f}%"
            )
        
        if len(sorted_sources) > 20:
            report.append(f"... 他 {len(sorted_sources) - 20} 件の送信元")
        report.append("")
        
        # 失敗の詳細
        if self.summary['failures']:
            report.append("【認証失敗の詳細】")
            report.append("-" * 40)
            
            # 失敗を集計
            failure_summary = defaultdict(lambda: {'count': 0, 'ips': set()})
            for failure in self.summary['failures']:
                key = f"{failure['spf']}_{failure['dkim']}"
                failure_summary[key]['count'] += failure['count']
                failure_summary[key]['ips'].add(failure['hostname'])
            
            for key, data in sorted(failure_summary.items(), key=lambda x: x[1]['count'], reverse=True):
                spf, dkim = key.split('_')
                report.append(f"SPF={spf}, DKIM={dkim}: {data['count']:,} メール")
                
                # 上位5つのIPを表示
                for ip in list(data['ips'])[:5]:
                    report.append(f"  - {ip}")
                if len(data['ips']) > 5:
                    report.append(f"  ... 他 {len(data['ips']) - 5} 件")
                report.append("")
        
        # 推奨アクション
        report.append("【推奨アクション】")
        report.append("-" * 40)
        
        if pass_rate >= 99:
            report.append("✅ 認証率が99%以上です。reject ポリシーへの移行を検討できます。")
        elif pass_rate >= 95:
            report.append("⚠️ 認証率が95%以上です。quarantine ポリシーの適用を検討できます。")
        else:
            report.append("❌ 認証率が95%未満です。失敗の原因を調査してください。")
        
        # 問題のある送信元
        problem_sources = []
        for ip, stats in self.summary['sources'].items():
            if stats['count'] >= 10 and stats['both_pass'] / stats['count'] < 0.5:
                problem_sources.append((ip, stats))
        
        if problem_sources:
            report.append("")
            report.append("⚠️ 以下の送信元で認証失敗が多発しています:")
            for ip, stats in problem_sources[:5]:
                hostname = stats['hostname'] if stats['hostname'] != ip else ip
                report.append(f"  - {hostname}: {stats['count']} メール中 {stats['both_pass']} 成功")
        
        report.append("")
        report.append("=" * 70)
        
        return '\n'.join(report)
    
    def export_json(self, filepath: str) -> None:
        """結果をJSON形式でエクスポート"""
        # datetime オブジェクトを文字列に変換
        export_data = {
            'summary': self.summary,
            'reports': self.reports
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)

def main():
    parser = argparse.ArgumentParser(description='DMARC集約レポート分析ツール')
    parser.add_argument('files', nargs='+', help='DMARCレポートファイル（XML、GZ、ZIP）')
    parser.add_argument('--json', help='JSON形式で出力', metavar='FILE')
    parser.add_argument('--output', '-o', help='レポートをファイルに保存', metavar='FILE')
    
    args = parser.parse_args()
    
    analyzer = DMARCReportAnalyzer()
    
    # すべてのファイルを読み込み
    for filepath in args.files:
        if os.path.exists(filepath):
            print(f"読み込み中: {filepath}")
            analyzer.load_report(filepath)
        else:
            print(f"警告: ファイルが見つかりません: {filepath}", file=sys.stderr)
    
    # レポート生成
    report = analyzer.generate_report()
    
    # 出力
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"レポートを {args.output} に保存しました")
    else:
        print(report)
    
    # JSON出力
    if args.json:
        analyzer.export_json(args.json)
        print(f"JSON形式で {args.json} に保存しました")

if __name__ == "__main__":
    main()