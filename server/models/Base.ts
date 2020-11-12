import {prop} from "@typegoose/typegoose";
import {nanoid} from "nanoid";

export class Base<T = string> {
    @prop({required: true})
    _id?: T
}

export class IDBase {
    @prop({default: nanoid()})
    _id?: string
}