(function () {
  window.PullPath = function (github, path) {
    this.absolutePath = path;
    this.github = github;
    var splittedPath = Path.split(Path.current());
    this.id = parseInt(splittedPath[3], 10);
  };

  window.PullPath.prototype.getRealRefs = function (callback, errorCallback) {
    if (this._getRealRefs === undefined) {
      var path = Path.join(["repos", this.github.basePath, "pulls", this.id]);
      Github.api(path, function (json) {
        this._getRealRefs = [json.base.sha, json.head.sha, json.base.repo.full_name, json.head.repo.full_name];
        callback(this._getRealRefs.slice(0, 2), this._getRealRefs.slice(2, 4));
      }, errorCallback);
    } else {
      callback(this._getRealRefs);
    }
  };

  window.PullPath.prototype.absolutePath = function () {
    if (this.path.match(/^http/)) {
      return this.path;
    } else {
      return Path.join([Github.HOST, this.github.basePath, "blob", this.ref, this.path]);
    }
  };

}());

