import { spawn, execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { copyScaffoldFiles, findScaffoldSource } from './scaffold.js';

interface NewOptions {
  directory: string;
}

function runSetup(baseDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const setupScript = join(baseDir, 'scripts', 'setup.js');
    
    if (!existsSync(setupScript)) {
      console.log('\n⚠ Setup script not found, skipping interactive setup.');
      resolve();
      return;
    }

    console.log('\n🚀 Starting interactive setup...\n');
    
    const child = spawn('node', [setupScript], {
      cwd: baseDir,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Setup exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

export async function createNew(options: NewOptions): Promise<void> {
  const targetDir = resolve(process.cwd(), options.directory);
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

  if (existsSync(targetDir)) {
    const files = readdirSync(targetDir);
    if (files.length > 0) {
      console.error(`\n❌ Directory "${options.directory}" already exists and is not empty.`);
      process.exit(1);
    }
  }

  console.log('\n📦 Creating new prompts.chat instance...\n');

  let scaffoldSource;
  try {
    scaffoldSource = findScaffoldSource(packageRoot);
    console.log(
      scaffoldSource.bundled
        ? '  Unpacking bundled scaffold...'
        : '  Copying local scaffold...'
    );
    copyScaffoldFiles(scaffoldSource.sourceDir, targetDir);
  } catch (error) {
    console.error('\n❌ Failed to prepare the scaffold.');
    console.error(`   ${(error as Error).message}`);
    process.exit(1);
  } finally {
    scaffoldSource?.cleanup?.();
  }

  // Install dependencies
  console.log('\n📥 Installing dependencies...\n');
  try {
    execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
  } catch {
    console.error('\n⚠ Failed to install dependencies. You can run "npm install" manually.');
  }

  // Run the setup script
  try {
    await runSetup(targetDir);
  } catch (error) {
    console.error('\n⚠ Setup failed:', (error as Error).message);
  }

  console.log('\n✅ Done! Your prompts.chat instance is ready.\n');
  console.log(`   cd ${options.directory}`);
  console.log('   npm run dev\n');
}
