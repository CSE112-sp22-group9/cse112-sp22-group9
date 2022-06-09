
#### Overview
This document serves to describe our repo's branch structure, explain how branch naming/branch checking format, as well as the build process and what happens at each step.


#### Repo branch structure
Our repo has three branches, `main`, `testing`, and `development`. More differences will be explained in the pipline section, but the differences are:
- `main`: our "production" branch, it is deployed via firebase at [this link](https://stegosource-9lives.web.app/)
- `development`: used by devs to branch off of to work on, and to make pull requests to
- `testing`: an intermediate branch between our development and main branches, code is periodically merged from development to run tests, and for testers to look at code that is not as rapidly changing as development.

#### Branching off development, and branch naming
When devs want to work on the project, they should be branching off `development`, but how should you name your branch? Ideally branches should be related to a certain issue on our Github issue page. The general format is `NL-[issue number]_[issue description]-[name]`. In our pipeline, we utilize Husky's pre-commit checks to check for correct branch naming using the bash script `./husky/hooks/checkBranchNaming.sh`. Feel free to take a look and modify the regular expression if needed.

#### Pipeline
We will outline what our pipeline is, starting with an "issue branch" created above.:

- **Pushing local changes** : after working on the issue on your branch from `development`, you are ready to commit and push! Husky will run pre-commit checks before allowing you to commit your code
  - linting and styling: prettier and eslint will be run against your *staged files* (the files you wish to change). The configs here are found in the eslint and prettier configuration files in the project root directory.
  - branch name checking: we use a regular expression to enforce your branch name

- **Creating a PR to `development`** once these tests are passed, you can commit your code and push your branch to Github and create a PR! This will run a couple Github action workflows: Linting and style checking on *all* of the code will be run. The same configuration files are used as the ones in Husky. There will also be a "PR preview link" created by firebase that deploys to a temporary link your changes. This will be automatically commented on in your PR

- **merging `development` to `testing`**: when appropriate, `development` should be merged into `testing`. There is no strict time table for doing this, but you can think of the `testing` branch as sort of a "staging area" that allows a more stable build to test and review on before merging to `main` since the dev branch could change rapidly with many different branched being merged and branched off of it.
  - merging to `testing` triggers automatic deployment to our permanent testing deployment (a [this link(https://testing-stegosource-9lives.web.app/)]). Additionally it runs our suite of end to end tests on the newly deployed site. (Note that the tests will only be run on a successful deployment)

- **merging `testing` to `main`**: once things look good, merging these branches will automatically deploy to our firebase deployment (from above), this will also generate jsDocs to be pushed to our documentation site [here](https://dustinlin.github.io/CSE112-sp22-group9-docs/). Note that this repo is hosted by one of our members and will most likely need to be changed (check the jsDoc yml file in `.github/workflows`).
