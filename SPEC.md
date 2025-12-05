# 超簡易日付投票アプリ SPEC

## 目的
短期の日付調整を最小の操作で行う仕組みを提供する。開催候補日を提示し、参加希望者が匿名で投票する。作成者は票数を確認し、人数の多い日に決定する。

## 範囲
本仕様は Render 無料枠で動作する最小構成の実装を対象とする。Node.js と Express を用い、Render PostgreSQL を利用する。認証は実装しない。ブラウザは単一の HTML で作成画面、編集画面、投票画面を提供する。

## 用語
作成者は投票フォームを作成するユーザーを指す。参加者は投票画面で日付に投票するユーザーを指す。フォーム ID は投票フォームを一意に識別する文字列を指す。編集シークレットは編集画面のアクセス制御に用いる短いトークンを指す。

## システム概要
アプリケーションは単一の Web サービスとして動作する。サーバは API と静的 HTML を提供する。データベースは forms テーブルと counts テーブルで構成する。投票は匿名とし、ブラウザの localStorage に端末単位の投票済み日付を記録する。多重投票の厳密な抑止は行わない。

## 画面
作成画面は開始日、終了日、メッセージ、候補上限日数、平日のみの有無を入力してフォームを作成する。作成ボタンを押すとフォーム ID と編集用 URL と投票用 URL を返す。編集画面は投票用 URL を確認できる。投票画面は候補日と現在の票数を表示する。参加者は任意の日付ボタンを押して投票する。

## データモデル
forms テーブルは以下の列で構成する。
- form_id: text。主キー。
- message: text。投票画面に表示する案内文。
- options: jsonb。日付の ISO 配列。
- secret: text。編集用シークレット。
- created_at: timestamptz。作成時刻。

counts テーブルは以下の列で構成する。
- form_id: text。外部キー。forms.form_id を参照する。
- date: date。候補日。
- count: integer。票数。既定値は 0。
複合主キーは (form_id, date) とする。

## API
サーバは以下のエンドポイントを提供する。すべて JSON を返す。

POST /api/forms  
開始日、終了日、メッセージ、候補上限日数、平日のみの有無を受け取り、新しいフォームを作成する。成功時に formId、editUrl、voteUrl を返す。  
入力: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD", message: string, days: number (省略時 10), weekdaysOnly: boolean (省略時 true) }  
出力: { formId: string, editUrl: string, voteUrl: string }

GET /api/forms/:id  
フォーム情報と現在の票数を返す。  
出力: { formId: string, message: string, options: string[], counts: Record<string, number> }

POST /api/forms/:id/vote  
指定した日付の票数を 1 増やす。  
入力: { date: "YYYY-MM-DD" }  
出力: { ok: true }

## 日付候補の生成
サーバは startDate から endDate までを走査して日付候補を生成する。平日のみの指定が true の場合、土曜と日曜を除外する。days を指定した場合、候補数を days 件に制限する。祝日の除外は本仕様に含めない。

## 検証
POST /api/forms は startDate、endDate、message の欠落を 400 で返す。POST /api/forms/:id/vote は date の欠落を 400 で返す。GET /api/forms/:id は存在しないフォーム ID に対して 404 を返す。

## 編集
本最小版はメッセージの更新や期間の再計算を実装しない。編集画面は投票 URL の確認に用いる。将来の拡張時は PUT /api/forms/:id を追加し、secret による簡易な保護を行う。

## セキュリティおよびプライバシー
本最小版は認証を実装しない。編集用 URL に短いトークンを含め、編集画面のリンクの露出を避ける。投票は匿名とし、個人情報を保存しない。ブラウザは localStorage に端末単位の投票済み情報を保持する。

## 非機能要件
Render 無料枠の特性によりコールドスタートが起きる。投票の同時更新はデータベースの UPSERT を用いて整合性を保つ。レスポンスは JSON とする。クライアントは単一の HTML で実装し、モダンブラウザを対象とする。

## デプロイ
Render で Web サービスを作成し、Node.js を選択する。ビルドコマンドは npm ci、起動コマンドは npm start とする。Render PostgreSQL を作成し、接続文字列を環境変数 DATABASE_URL として設定する。初回起動時にサーバは自動でテーブルを作成する。

## 非対象
ユーザー認証、厳密な多重投票防止、祝日除外、通知機能、CSV エクスポートは本仕様の対象に含めない。

## 保留事項
祝日除外の要否、編集機能の詳細、投票の締切表示の要否については相談して決定する。

