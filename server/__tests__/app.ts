import AppBuilder from "../init/build-app";

export const TEST_APP_PORT = 8087

export const testApp = new AppBuilder()
    .port(TEST_APP_PORT)
    .withAppBuildConfig({useLogger: false}).build()
