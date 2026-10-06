import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { saveUser } from '../lib/auth-core.mjs';
import { closePg } from '../db/runtime.mjs';

const args = process.argv.slice(2);
const argument = name => args[args.indexOf(name) + 1];
const email = args.includes('--email') ? argument('--email') : '';
const name = args.includes('--name') ? argument('--name') : email.split('@')[0];
if (!email) {
  console.error('Usage: npm run user:create -- --email you@example.com --name "Your name" [--reset]');
  process.exit(1);
}

async function hiddenPassword(prompt) {
  if (!stdin.isTTY) throw new Error('Run this command in an interactive terminal. With Docker use: docker compose exec app node scripts/user.mjs ...');
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.setEncoding('utf8');
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      stdin.off('data', receive); stdin.setRawMode(false); stdin.pause(); stdout.write('\n');
      if (error) reject(error); else resolve(value);
    };
    const receive = chunk => {
      for (const character of chunk) {
        if (character === '\u0003') { finish(new Error('Canceled.')); return; }
        if (character === '\r' || character === '\n') { finish(); return; }
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
        else if (character >= ' ' && value.length < 1024) value += character;
      }
    };
    stdin.on('data', receive);
  });
}

try {
  if (args.includes('--reset')) {
    const rl = createInterface({ input: stdin, output: stdout });
    const confirmation = await rl.question('Reset this account and revoke its sessions? Type YES: ');
    rl.close();
    if (confirmation !== 'YES') throw new Error('Canceled.');
  }
  const password = await hiddenPassword('Password (12+ characters, hidden): ');
  const repeat = await hiddenPassword('Repeat password: ');
  if (password !== repeat) throw new Error('Passwords do not match.');
  await saveUser(email, name, password, args.includes('--reset'));
  console.log('Account saved. Sign in using the email and password you chose.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await closePg(); }
