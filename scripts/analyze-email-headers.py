#!/usr/bin/env python3

"""
メールヘッダー解析ツール
DKIM、SPF、DMARC認証結果を解析し、詳細なレポートを生成
"""

import sys
import re
import json
import base64
from datetime import datetime
from typing import Dict, List, Optional, Tuple

class EmailHeaderAnalyzer:
    def __init__(self):
        self.headers = {}
        self.authentication_results = []
        self.dkim_signatures = []
        
    def parse_headers(self, header_text: str) -> None:
        """メールヘッダーをパース"""
        current_header = ""
        current_value = ""
        
        lines = header_text.replace('\r\n', '\n').split('\n')
        
        for line in lines:
            if line.startswith(' ') or line.startswith('\t'):
                # 継続行
                current_value += ' ' + line.strip()
            else:
                # 新しいヘッダー
                if current_header:
                    self._add_header(current_header, current_value)
                
                if ':' in line:
                    parts = line.split(':', 1)
                    current_header = parts[0].strip()
                    current_value = parts[1].strip() if len(parts) > 1 else ""
        
        # 最後のヘッダーを追加
        if current_header:
            self._add_header(current_header, current_value)
    
    def _add_header(self, name: str, value: str) -> None:
        """ヘッダーを追加"""
        name_lower = name.lower()
        
        if name_lower not in self.headers:
            self.headers[name_lower] = []
        self.headers[name_lower].append(value)
        
        # 特定のヘッダーを個別に処理
        if name_lower == 'authentication-results':
            self.authentication_results.append(self._parse_auth_results(value))
        elif name_lower == 'dkim-signature':
            self.dkim_signatures.append(self._parse_dkim_signature(value))
    
    def _parse_auth_results(self, value: str) -> Dict:
        """Authentication-Resultsヘッダーを解析"""
        result = {
            'server': '',
            'dkim': None,
            'spf': None,
            'dmarc': None,
            'raw': value
        }
        
        # サーバー名を抽出
        server_match = re.match(r'^([^;]+);', value)
        if server_match:
            result['server'] = server_match.group(1).strip()
        
        # DKIM結果
        dkim_match = re.search(r'dkim=(\w+)', value)
        if dkim_match:
            result['dkim'] = {
                'result': dkim_match.group(1),
                'details': {}
            }
            
            # DKIM詳細
            dkim_detail = re.search(r'dkim=\w+\s+\(([^)]+)\)', value)
            if dkim_detail:
                result['dkim']['details']['reason'] = dkim_detail.group(1)
            
            header_i = re.search(r'header\.i=([^\s;]+)', value)
            if header_i:
                result['dkim']['details']['identity'] = header_i.group(1)
            
            header_s = re.search(r'header\.s=([^\s;]+)', value)
            if header_s:
                result['dkim']['details']['selector'] = header_s.group(1)
        
        # SPF結果
        spf_match = re.search(r'spf=(\w+)', value)
        if spf_match:
            result['spf'] = {
                'result': spf_match.group(1),
                'details': {}
            }
            
            spf_detail = re.search(r'spf=\w+\s+\(([^)]+)\)', value)
            if spf_detail:
                result['spf']['details']['reason'] = spf_detail.group(1)
        
        # DMARC結果
        dmarc_match = re.search(r'dmarc=(\w+)', value)
        if dmarc_match:
            result['dmarc'] = {
                'result': dmarc_match.group(1),
                'details': {}
            }
            
            policy_match = re.search(r'p=(\w+)', value)
            if policy_match:
                result['dmarc']['details']['policy'] = policy_match.group(1)
        
        return result
    
    def _parse_dkim_signature(self, value: str) -> Dict:
        """DKIM-Signatureヘッダーを解析"""
        signature = {
            'version': '',
            'algorithm': '',
            'canonicalization': '',
            'domain': '',
            'selector': '',
            'headers': [],
            'body_hash': '',
            'signature': '',
            'timestamp': None,
            'expiration': None,
            'raw': value
        }
        
        # タグと値を抽出
        tags = {}
        tag_pattern = re.compile(r'([a-z])=([^;]+)(?:;|$)')
        for match in tag_pattern.finditer(value):
            tag = match.group(1)
            val = match.group(2).strip()
            tags[tag] = val
        
        # 各フィールドをマッピング
        signature['version'] = tags.get('v', '')
        signature['algorithm'] = tags.get('a', '')
        signature['canonicalization'] = tags.get('c', '')
        signature['domain'] = tags.get('d', '')
        signature['selector'] = tags.get('s', '')
        signature['body_hash'] = tags.get('bh', '')
        signature['signature'] = tags.get('b', '').replace(' ', '')
        
        if 'h' in tags:
            signature['headers'] = [h.strip() for h in tags['h'].split(':')]
        
        if 't' in tags:
            try:
                signature['timestamp'] = int(tags['t'])
            except ValueError:
                pass
        
        if 'x' in tags:
            try:
                signature['expiration'] = int(tags['x'])
            except ValueError:
                pass
        
        return signature
    
    def analyze(self) -> Dict:
        """分析結果を生成"""
        analysis = {
            'summary': {
                'dkim': 'not_found',
                'spf': 'not_found',
                'dmarc': 'not_found',
                'overall': 'fail'
            },
            'details': {
                'authentication_results': self.authentication_results,
                'dkim_signatures': self.dkim_signatures,
                'from': self.headers.get('from', []),
                'to': self.headers.get('to', []),
                'subject': self.headers.get('subject', []),
                'date': self.headers.get('date', []),
                'message_id': self.headers.get('message-id', [])
            },
            'recommendations': []
        }
        
        # 認証結果のサマリー
        for auth_result in self.authentication_results:
            if auth_result['dkim']:
                analysis['summary']['dkim'] = auth_result['dkim']['result']
            if auth_result['spf']:
                analysis['summary']['spf'] = auth_result['spf']['result']
            if auth_result['dmarc']:
                analysis['summary']['dmarc'] = auth_result['dmarc']['result']
        
        # 総合評価
        if (analysis['summary']['dkim'] == 'pass' and 
            analysis['summary']['spf'] == 'pass'):
            analysis['summary']['overall'] = 'pass'
        elif (analysis['summary']['dkim'] == 'pass' or 
              analysis['summary']['spf'] == 'pass'):
            analysis['summary']['overall'] = 'partial'
        
        # 推奨事項
        if analysis['summary']['dkim'] != 'pass':
            analysis['recommendations'].append(
                "DKIM署名が検証できません。DNS設定とメールサーバー設定を確認してください。"
            )
        
        if analysis['summary']['spf'] != 'pass':
            analysis['recommendations'].append(
                "SPF認証が失敗しています。送信元IPがSPFレコードに含まれているか確認してください。"
            )
        
        if analysis['summary']['dmarc'] == 'not_found':
            analysis['recommendations'].append(
                "DMARCポリシーが設定されていません。なりすまし対策のため設定を推奨します。"
            )
        
        # DKIM署名の詳細分析
        for sig in self.dkim_signatures:
            if sig['algorithm'] and 'sha1' in sig['algorithm'].lower():
                analysis['recommendations'].append(
                    f"DKIM署名がSHA1を使用しています（セレクタ: {sig['selector']}）。SHA256への移行を推奨します。"
                )
            
            if sig['signature']:
                # 署名の推定ビット長
                sig_bytes = len(base64.b64decode(sig['signature'] + '=='))
                sig_bits = sig_bytes * 8
                if sig_bits < 2048:
                    analysis['recommendations'].append(
                        f"DKIM鍵長が{sig_bits}ビットです。2048ビット以上を推奨します。"
                    )
        
        return analysis
    
    def generate_report(self, analysis: Dict) -> str:
        """分析レポートを生成"""
        report = []
        report.append("=" * 60)
        report.append("メールヘッダー認証分析レポート")
        report.append("=" * 60)
        report.append("")
        
        # サマリー
        report.append("【認証結果サマリー】")
        report.append("-" * 30)
        
        status_emoji = {
            'pass': '✅',
            'fail': '❌',
            'neutral': '⚠️',
            'none': '⚠️',
            'not_found': '❓'
        }
        
        dkim_status = analysis['summary']['dkim']
        spf_status = analysis['summary']['spf']
        dmarc_status = analysis['summary']['dmarc']
        
        report.append(f"DKIM:  {status_emoji.get(dkim_status, '❓')} {dkim_status.upper()}")
        report.append(f"SPF:   {status_emoji.get(spf_status, '❓')} {spf_status.upper()}")
        report.append(f"DMARC: {status_emoji.get(dmarc_status, '❓')} {dmarc_status.upper()}")
        report.append("")
        
        # 総合評価
        overall = analysis['summary']['overall']
        if overall == 'pass':
            report.append("総合評価: ✅ 完全認証成功")
        elif overall == 'partial':
            report.append("総合評価: ⚠️ 部分的認証")
        else:
            report.append("総合評価: ❌ 認証失敗")
        report.append("")
        
        # メール情報
        if analysis['details']['from']:
            report.append(f"送信者: {analysis['details']['from'][0]}")
        if analysis['details']['to']:
            report.append(f"受信者: {analysis['details']['to'][0]}")
        if analysis['details']['subject']:
            report.append(f"件名: {analysis['details']['subject'][0]}")
        if analysis['details']['date']:
            report.append(f"日時: {analysis['details']['date'][0]}")
        report.append("")
        
        # DKIM署名詳細
        if analysis['details']['dkim_signatures']:
            report.append("【DKIM署名詳細】")
            report.append("-" * 30)
            for i, sig in enumerate(analysis['details']['dkim_signatures'], 1):
                report.append(f"署名 #{i}:")
                report.append(f"  ドメイン: {sig['domain']}")
                report.append(f"  セレクタ: {sig['selector']}")
                report.append(f"  アルゴリズム: {sig['algorithm']}")
                report.append(f"  正規化: {sig['canonicalization']}")
                if sig['timestamp']:
                    timestamp = datetime.fromtimestamp(sig['timestamp'])
                    report.append(f"  タイムスタンプ: {timestamp}")
                report.append("")
        
        # 認証結果詳細
        if analysis['details']['authentication_results']:
            report.append("【認証結果詳細】")
            report.append("-" * 30)
            for auth in analysis['details']['authentication_results']:
                report.append(f"検証サーバー: {auth['server']}")
                
                if auth['dkim']:
                    report.append(f"  DKIM: {auth['dkim']['result']}")
                    if auth['dkim']['details']:
                        for key, val in auth['dkim']['details'].items():
                            report.append(f"    {key}: {val}")
                
                if auth['spf']:
                    report.append(f"  SPF: {auth['spf']['result']}")
                    if auth['spf']['details']:
                        for key, val in auth['spf']['details'].items():
                            report.append(f"    {key}: {val}")
                
                if auth['dmarc']:
                    report.append(f"  DMARC: {auth['dmarc']['result']}")
                    if auth['dmarc']['details']:
                        for key, val in auth['dmarc']['details'].items():
                            report.append(f"    {key}: {val}")
                report.append("")
        
        # 推奨事項
        if analysis['recommendations']:
            report.append("【推奨事項】")
            report.append("-" * 30)
            for i, rec in enumerate(analysis['recommendations'], 1):
                report.append(f"{i}. {rec}")
            report.append("")
        
        report.append("=" * 60)
        
        return '\n'.join(report)

def main():
    """メイン処理"""
    print("メールヘッダー解析ツール")
    print("=" * 40)
    print("メールヘッダーを貼り付けてください。")
    print("入力を終了するには、空行を2回入力してください。")
    print("")
    
    # ヘッダーの入力を受け付ける
    header_lines = []
    empty_count = 0
    
    while True:
        try:
            line = input()
            if line == "":
                empty_count += 1
                if empty_count >= 2:
                    break
            else:
                empty_count = 0
                header_lines.append(line)
        except EOFError:
            break
    
    if not header_lines:
        print("エラー: ヘッダーが入力されていません")
        sys.exit(1)
    
    header_text = '\n'.join(header_lines)
    
    # 解析実行
    analyzer = EmailHeaderAnalyzer()
    analyzer.parse_headers(header_text)
    analysis = analyzer.analyze()
    
    # レポート生成
    report = analyzer.generate_report(analysis)
    print("\n" + report)
    
    # JSON出力オプション
    print("\nJSON形式で出力しますか？ (y/n): ", end="")
    if input().lower() == 'y':
        print("\n" + json.dumps(analysis, indent=2, ensure_ascii=False))
    
    # ファイル保存オプション
    print("\n結果をファイルに保存しますか？ (y/n): ", end="")
    if input().lower() == 'y':
        filename = f"email-analysis-{datetime.now().strftime('%Y%m%d-%H%M%S')}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(report)
            f.write("\n\n--- JSON形式 ---\n")
            f.write(json.dumps(analysis, indent=2, ensure_ascii=False))
        print(f"結果を {filename} に保存しました")

if __name__ == "__main__":
    main()