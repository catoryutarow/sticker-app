import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = process.env.EMAIL_FROM || 'シール帳 <noreply@example.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const APP_NAME = 'シール帳';

/**
 * メール送信が有効かどうか
 */
export const isEmailEnabled = () => !!resend;

/**
 * メール認証メールを送信
 * @param {string} email - 送信先メールアドレス
 * @param {string} token - 認証トークン
 */
export async function sendVerificationEmail(email, token) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping verification email');
    console.log(`[Email] Verification URL: ${FRONTEND_URL}/verify-email?token=${token}`);
    return;
  }

  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `[${APP_NAME}] メールアドレスの確認`,
      html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; font-size: 24px; margin: 0;">${APP_NAME}</h1>
  </div>

  <h2 style="font-size: 20px; margin-bottom: 16px;">メールアドレスの確認</h2>

  <p style="margin-bottom: 16px; line-height: 1.6;">
    ${APP_NAME}にご登録いただきありがとうございます。<br>
    以下のボタンをクリックしてメールアドレスを確認してください。
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${verifyUrl}"
       style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      メールアドレスを確認する
    </a>
  </div>

  <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
    ボタンが機能しない場合は、以下のURLをブラウザに直接貼り付けてください：
  </p>
  <p style="font-size: 12px; color: #888; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 4px;">
    ${verifyUrl}
  </p>

  <p style="font-size: 14px; color: #666; margin-top: 24px;">
    このリンクは<strong>24時間</strong>有効です。
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="font-size: 12px; color: #999;">
    このメールに心当たりがない場合は、無視していただいて構いません。
  </p>
</body>
</html>
      `,
      text: `
${APP_NAME} - メールアドレスの確認

${APP_NAME}にご登録いただきありがとうございます。
以下のURLをクリックしてメールアドレスを確認してください。

${verifyUrl}

このリンクは24時間有効です。

このメールに心当たりがない場合は、無視していただいて構いません。
      `,
    });
    console.log(`[Email] Verification email sent to ${email}`);
  } catch (error) {
    console.error('[Email] Failed to send verification email:', error);
    throw new Error('メール送信に失敗しました');
  }
}

/**
 * パスワードリセットメールを送信
 * @param {string} email - 送信先メールアドレス
 * @param {string} token - リセットトークン
 */
export async function sendPasswordResetEmail(email, token) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping password reset email');
    console.log(`[Email] Reset URL: ${FRONTEND_URL}/reset-password?token=${token}`);
    return;
  }

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `[${APP_NAME}] パスワードリセット`,
      html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; font-size: 24px; margin: 0;">${APP_NAME}</h1>
  </div>

  <h2 style="font-size: 20px; margin-bottom: 16px;">パスワードリセット</h2>

  <p style="margin-bottom: 16px; line-height: 1.6;">
    パスワードリセットのリクエストを受け付けました。<br>
    以下のボタンをクリックして新しいパスワードを設定してください。
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${resetUrl}"
       style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      パスワードをリセットする
    </a>
  </div>

  <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
    ボタンが機能しない場合は、以下のURLをブラウザに直接貼り付けてください：
  </p>
  <p style="font-size: 12px; color: #888; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 4px;">
    ${resetUrl}
  </p>

  <p style="font-size: 14px; color: #666; margin-top: 24px;">
    このリンクは<strong>1時間</strong>有効です。
  </p>

  <div style="background: #FEF3C7; padding: 16px; border-radius: 8px; margin-top: 24px;">
    <p style="margin: 0; font-size: 14px; color: #92400E;">
      ⚠️ このリクエストに心当たりがない場合は、アカウントのセキュリティを確認してください。
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="font-size: 12px; color: #999;">
    パスワードリセットをリクエストしていない場合は、このメールを無視してください。
    パスワードは変更されません。
  </p>
</body>
</html>
      `,
      text: `
${APP_NAME} - パスワードリセット

パスワードリセットのリクエストを受け付けました。
以下のURLをクリックして新しいパスワードを設定してください。

${resetUrl}

このリンクは1時間有効です。

⚠️ このリクエストに心当たりがない場合は、アカウントのセキュリティを確認してください。

パスワードリセットをリクエストしていない場合は、このメールを無視してください。
パスワードは変更されません。
      `,
    });
    console.log(`[Email] Password reset email sent to ${email}`);
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error);
    throw new Error('メール送信に失敗しました');
  }
}

/**
 * アカウント削除確認メールを送信
 * @param {string} email - 送信先メールアドレス
 */
export async function sendAccountDeletedEmail(email) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping account deletion email');
    return;
  }

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `[${APP_NAME}] アカウント削除完了`,
      html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; font-size: 24px; margin: 0;">${APP_NAME}</h1>
  </div>

  <h2 style="font-size: 20px; margin-bottom: 16px;">アカウント削除完了</h2>

  <p style="margin-bottom: 16px; line-height: 1.6;">
    ご利用いただきありがとうございました。<br>
    アカウントの削除が完了しました。
  </p>

  <p style="margin-bottom: 16px; line-height: 1.6;">
    削除されたデータ：
  </p>
  <ul style="line-height: 1.8; color: #666;">
    <li>アカウント情報</li>
    <li>作成したキット</li>
    <li>保存した作品</li>
  </ul>

  <p style="margin-top: 24px; line-height: 1.6;">
    またのご利用をお待ちしております。
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="font-size: 12px; color: #999;">
    このメールに心当たりがない場合は、お問い合わせください。
  </p>
</body>
</html>
      `,
      text: `
${APP_NAME} - アカウント削除完了

ご利用いただきありがとうございました。
アカウントの削除が完了しました。

削除されたデータ：
- アカウント情報
- 作成したキット
- 保存した作品

またのご利用をお待ちしております。
      `,
    });
    console.log(`[Email] Account deletion email sent to ${email}`);
  } catch (error) {
    console.error('[Email] Failed to send account deletion email:', error);
    // アカウント削除メールの失敗は致命的ではないのでエラーを投げない
  }
}
