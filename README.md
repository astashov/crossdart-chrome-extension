# Crossdart Chrome Extension

This extension adds "Go to definition" and "Find usages" functionality to Dart projects on Github,
to the tree views and pull requests.
You can take it there:

[https://chrome.google.com/webstore/detail/crossdart-chrome-extensio/jmdjoliiaibifkklhipgmnciiealomhd](https://chrome.google.com/webstore/detail/crossdart-chrome-extensio/jmdjoliiaibifkklhipgmnciiealomhd)

## Demo

[Here](https://www.crossdart.info/demo.html) (1.7MB)

## Installation

### Simple way

If you have a public project, or a private project without other private dependencies, you can just install
the extension into Chrome, go to a repo on Github, click on "XD" icon in the Chrome toolbar, and check the checkbox
"Enable Crossdart for this project". That's it, the extension will send a request to analyze the source code
to https://metadata.crossdart.com/analyze, and it will analyze the source code and upload the analysis data to
Google Cloud Storage, where the extension will take it from. The extension will show the progress of the operations
in a popup in the right top corner.

You can preventively send the JSON request to POST https://metadata.crossdart.com/analyze, to speed up the analyzing process
(e.g. on commit or pull request hook). It accepts JSON payload, which look like this:

* url - required, String, the url of the project, looks like https://github.com/johnsmith/my-dart-project
* sha - required, String, full SHA of the commit
* token - optional, String, personal access token in case your project is private

Example:

```json
{"url":"https://github.com/johnsmith/my-dart-project","sha":"62e3956d59878f24dd0bdb042e2f3bc320bf159f"}
```

### More complicated, but private and secure way (for super private projects)

We destroy the cloned repo on metadata.crossdart.com as soon as possible right
after finishing analyzing, but in case you don't want to give access to your
code to anything at all, or you have private dependencies in your project,
you'll have to build the analysis data and upload them to some publicly
available place (e.g. S3 or GCS) by yourself.

Unfortunately, for now this is not just one-click installation, you have to do plenty of steps to make it work.
I'll try to document them here in details, to simplify the ramp up process.

Install it globally:

```bash
$ pub global activate crossdart
```

and then run as

```bash
$ pub global run crossdart --input=/path/to/your/project --dart-sdk=/path/to/dart-sdk
```

for example:

```bash
$ pub global run crossdart --input=/home/john/my_dart_project --dart-sdk=/usr/lib/dart
```

It will generate the crossdart.json file in the `--input` directory, which you will need to put somewhere, for example, to S3 (see below).

#### Uploading metadata

You need some publicly available place to store metadatas for every single commit for your project. You can use S3 for that. It's cheap and relatively easy to configure.

You probably may want to create a separate bucket on S3 for crossdart metadata files, and then set correct CORS configuration for it. For that, click to the bucket in AWS S3 console, and in the "Properties" tab find "Add CORS Configuration". You can add something like this there:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
  </CORSRule>
</CORSConfiguration>
```

To deliver your metadata files to S3, you can use s3cmd tool. Create a file `.s3cfg` with the contents:

```
[default]
access_key = YourAccessKey
secret_key = YourSecretKey
use_https = True
```

and then run `s3cmd` to put newly created file. Something like:

```bash
$ s3cmd -P -c /path/to/.s3cfg put /path/to/crossdart.json s3://my-bucket/my-project/32c139a7775736e96e476b1e0c89dd20e6588155/crossdart.json
```

The structure of the URL on S3 is important. It should always end with git sha and `crossdart.json`. Like above, the URL ends with `32c139a7775736e96e476b1e0c89dd20e6588155/crossdart.json`

#### Integrating with Travis CI

Doing all the uploads to S3 manually is very cumbersome, so better to use some machinery, like CI or build server, to do that stuff for you, for example Travis CI. Here's how the configuration could look like:

`.travis.yml` file:

```yaml
language: dart
dart:
  - stable
install:
  # Here are other stuff to install
  - travis_retry sudo apt-get install --yes s3cmd
# ...
# Other sections if needed
# ...
after_success:
  - tool/crossdart_runner
```

`tool/crossdart_runner` file:

```bash
#!/bin/bash
#
# This script is invoked by Travis CI to generate Crossdart metadata for the Crossdart Chrome extension
if [ "$TRAVIS_PULL_REQUEST" != "false" ]
then
  CROSSDART_HASH="${TRAVIS_COMMIT_RANGE#*...}"
else
  CROSSDART_HASH="${TRAVIS_COMMIT}"
fi
echo "Installing crossdart"
pub global activate crossdart
echo "Generating metadata for crossdart"
pub global run crossdart --input=. --dart-sdk=$DART_SDK
echo "Copying the crossdart json file to S3 ($CROSSDART_HASH)"
s3cmd -P -c ./.s3cfg put ./crossdart.json s3://my-bucket/my-project/$CROSSDART_HASH/crossdart.json
```

Now, every time somebody pushes to 'master', after Travis run, I'll have hyperlinked code of my project on Github.
And every time somebody creates a pull request for me on Github, it's code also going to be hyperlinked.

How cool is that! :)

## Setting up the Crossdart Chrome extension:

After installing [Crossdart Chrome Extension](https://chrome.google.com/webstore/detail/crossdart-chrome-extensio/jmdjoliiaibifkklhipgmnciiealomhd), you'll see a little "XD" icon in Chrome's URL bar on Github pages.
If you click to it, you'll see a little popup, where you can turn Crossdart on for the current project, and also
specify the URL where it should get the analysis data from (in case you generated and uploaded it by yourself. If you don't - just leave it empty).
You only should provide a base for this URL, the extension will later append git sha and 'crossdart.json' to it. I.e. if you specify URL in this field like:

```
https://my-bucket.s3.amazonaws.com/crossdart/my-project
```

then the extension will try to find crossdart.json files by URLs, which will look like:

```
https://my-bucket.s3.amazonaws.com/crossdart/my-project/4a9f8b41d042183116bbfaba31bdea109cc3080d/crossdart.json
```

If your project is private, you also will need to create access token, and paste it into the field in the popup as well.
You can do that there: https://github.com/settings/tokens/new.

## Contributing

Please use Github's bug tracker for bugs. Pull Requests are welcome.
