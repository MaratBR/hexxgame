import AppBuilder from "./src/init/build-app";
import "reflect-metadata"
import config from "./src/config";

new AppBuilder()
    .withConfig(config)
    .build()
    .run()