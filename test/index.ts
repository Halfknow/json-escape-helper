import * as path from "path";
import Mocha from "mocha";

const mocha = new Mocha({ ui: "tdd", color: true });
mocha.addFile(path.resolve(__dirname, "json-helper.test.js"));

mocha.run(failures => {
  process.exitCode = failures ? 1 : 0;
});
