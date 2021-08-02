import path from 'path';
import fs from 'fs';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import YAML from 'yaml';

const getParser = (file: string, options: { spacing: number }) => {
  const extension = path.extname(file).replace('.', '');

  switch (extension) {
    case 'json':
      return {
        read: JSON.parse,
        write: (data: any) => JSON.stringify(data, null, options.spacing),
      };
    case 'yaml':
    case 'yml':
      return {
        read: YAML.parse,
        write: (data: any) => YAML.stringify(data, { indent: options.spacing }),
      };
    default:
      throw new Error(`Unsupported file extension "${extension}".\nTo add it you can simply submit a PR adding a new parser.`);
  }
};

const run = async () => {
  core.info('Setting input and environment variables');
  const root = process.env.GITHUB_WORKSPACE as string;
  const tag = (process.env.GITHUB_REF as string).replace('refs/tags/', '');
  const token = core.getInput('repo-token');
  const regex = new RegExp(core.getInput('version-regexp'));
  const files = core.getInput('files').replace(' ', '').split(',');
  const message = core.getInput('commit-message');
  const spacing = parseInt(core.getInput('spacing-level'), 10);
  let branch = core.getInput('branch-name');
  let author = core.getInput('author-name');
  let email = core.getInput('author-email');
  let swagger = core.getInput('swagger');

  if (!token && !branch) {
    throw new Error('Either repo-token or branch-name must be supplied.');
  }

  if (token) {
    core.info('Setting up Octokit and context');
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    core.info('Fetching repo task history');
    const release = await octokit.repos.getReleaseByTag({ owner, repo, tag });

    if (release.data.tag_name !== tag) {
      throw new Error(`Release with name "${tag}" was not found`);
    }

    branch = release.data.target_commitish;

    if (!author && !email) {
      core.info('Getting author and email from release information');
      const username = release.data.author.login;
      const user = await octokit.users.getByUsername({ username });

      author = user.data.name;
      email = user.data.email;
      core.info(`👋 Nice to meet you ${author} (${email})!`);
    }
  } else {
    core.info('Skipping getting the latest release since not "repo-token" was provided');
  }

  core.info(`Checking latest tag "${tag}" against input regexp`);
  if (!regex.test(tag)) {
    throw new Error(`RegExp could not be matched to latest tag "${tag}"`);
  }

  const version = (tag.match(regex) as string[])[0];
  core.info(`Extracted new version "${version}" from "${tag}"`);

  // Forgive me for the unnecessary fanciness 🙏
  core.info('Updating files version field');
  const changed = files.reduce((change, file) => {
    const dir = path.join(root, file);
    const buffer = fs.readFileSync(dir, 'utf-8');
    const parser = getParser(file, { spacing });
    const content = parser.read(buffer);

    if (swagger) {
      if (content.info.version === version) {
        core.info(`  - ${file}: Skip since equal versions`);
        return change;
      }
  
      core.info(`  - ${file}: Update version from "${content.info.version}" to "${version}"`);
      content.version = version;
      fs.writeFileSync(dir, parser.write(content));
      return true;
    }

    if (content.version === version) {
      core.info(`  - ${file}: Skip since equal versions`);
      return change;
    }

    core.info(`  - ${file}: Update version from "${content.version}" to "${version}"`);
    content.version = version;
    fs.writeFileSync(dir, parser.write(content));
    return true;
  }, false);

  if (!changed) {
    core.info('Skipped commit since no files were changed');
    return;
  }

  core.info('Committing file changes');
  await exec.exec('git', ['config', '--global', 'user.name', author]);
  await exec.exec('git', ['config', '--global', 'user.email', email]);
  await exec.exec('git', ['commit', '-am', message.replace('%version%', version)]);
  await exec.exec('git', ['push', '-u', 'origin', `HEAD:${branch}`]);
};

run()
  .then(() => core.info('Updated files version successfully'))
  .catch(error => core.setFailed(error.message));
