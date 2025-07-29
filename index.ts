async function getCurrentCommitCount(): Promise<number> {
  try {
    const proc = Bun.spawn(["git", "rev-list", "--count", "HEAD"], { 
      stdout: 'pipe',
      stderr: 'pipe'
    });
    
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    
    if (proc.exitCode === 0) {
      return parseInt(stdout.trim(), 10);
    } else {
      return 0;
    }
  } catch (error) {
    return 0;
  }
}



async function runCommand(command: string, args: string[] = []): Promise<boolean> {
  try {
    const proc = Bun.spawn([command, ...args], { 
      stdout: 'pipe',
      stderr: 'pipe'
    });
    
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text()
    ]);
    
    await proc.exited;
    
    if (proc.exitCode === 0) {
      if (stdout.trim()) {
        console.log(stdout.trim());
      }
      return true;
    } else {
      console.error(`command failed: ${command} ${args.join(' ')}`);
      if (stderr.trim()) {
        console.error(stderr.trim());
      }
      return false;
    }
  } catch (error) {
    console.error(`failed to execute "${command}":`, error);
    return false;
  }
}

function parseArgs(): number {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("usage: bun run index.ts <number_of_commits>");
    process.exit(1);
  }

  const count = parseInt(args[0]!, 10);

  if (isNaN(count) || count < 1) {
    console.error("error: commit count must be a positive integer");
    process.exit(1);
  }

  return count;
}

async function createSingleCommit(): Promise<boolean> {
  const currentCount = await getCurrentCommitCount();
  const nextCommitNumber = currentCount + 1;

  const commitSuccess = await runCommand("git", ["commit", "--allow-empty", "-m", nextCommitNumber.toString()]);
  if (!commitSuccess) {
    return false;
  }

  const pushSuccess = await runCommand("git", ["push"]);
  if (!pushSuccess) {
    return false;
  }

  return true;
}

async function main(): Promise<void> {
  try {
    const commitCount = parseArgs();
    
    for (let i = 0; i < commitCount; i++) {
      console.log(`creating commit ${i + 1}/${commitCount}...`);
      
      const success = await createSingleCommit();
      if (!success) {
        console.error(`failed to create commit ${i + 1}`);
        process.exit(1);
      }
      
      console.log(`commit ${i + 1} completed`);
    }
    
    console.log(`all ${commitCount} commits completed successfully`);
  } catch (error) {
    console.error("script failed:", error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('unhandled promise rejection:', reason);
  process.exit(1);
});

main();