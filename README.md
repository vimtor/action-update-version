<div align="center">
   <h1>☝ update-version</h1>
   <p>Update your files version field on new releases</p>
   <p align="center">
    <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/pocket-studios/action-update-version">
   </p>
</div>

## 🧠 Why

- Most actions related to version upgrade do it backwards:
when you push a commit with version change in a specific branch a release is created.

- This action does the opposite: when you create a release the
specified files will get updated with the new version, so you don't forget to update them.

This comes in handy when working with git workflows such as [trunk-base-development](https://trunkbaseddevelopment.com/) or [master-only](https://www.youtube.com/watch?v=MWz-9uyHP4s).

## 🚀 Usage

With the following example after creating a new release with tag `v2.0.1` on branch `release`,
a new commit will appear in that same branch with both `package.json` and `app.yaml` updated
with the version field to `2.0.1`.

```yaml
name: Upgrade Version
on:
  release:
    types: [published]

jobs:
  upgrade-version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: pocket-studios/action-update-version@v1
        with:
          files: 'package.json, app.yaml'
          version-regexp: '\d+.\d+.\d+'
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

The action will fail if:
- Both `repo-token` and `branch-name` are not supplied
- The tag cannot be found by `octokit`
- The regular expression cannot match the release tag
- You specify a file with unsupported extension


## ⚙ Inputs

By supplying the `repo-token` the commit will use the release information: author and branch.

You can change the branch commit target and the commit author if you want.

**Name**|**Description**|**Default**
-----|-----|-----
files|Comma separated list of files to update its version field|package.json
version-regexp|Regular expression to match release tag name|\d+.\d+.\d+
repo-token|GitHub token to get the release information in order to push to branch|`null` 
commit-message|Commit message for files update. The %version% will get substituted|ci: update version to v%version%
spacing-level|Number of spaces for formatted files|`2`
branch-name|Default branch name to push changes if not repo-token is provided|*Release target branch* 
author-name|Commit author name|*Release author name* 
author-email|Commit author email|*Release author email* 

## 👋 Support

- Supported file extensions: `json`, `yaml` and `yml`. To add one simply submit a PR with a new parser on the `main.ts` file.
