import {Controller, Get} from "routing-controllers";

@Controller('/api')
export class ApiController {
    @Get('/hi')
    hi() {
        return 'hi'
    }
}