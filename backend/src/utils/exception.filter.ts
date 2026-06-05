import {ExceptionFilter as NestExceptionFilter, Catch, ArgumentsHost, HttpStatus, HttpException} from '@nestjs/common';
import { Request, Response } from 'express';
import {QueryFailedError} from "typeorm";
import {AppError} from "./AppError.js";

@Catch()
export class ExceptionFilter implements NestExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {

        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status;
        let responseBody;
        if (exception instanceof HttpException) {
            // default nest exception
            status = exception.getStatus();
            responseBody = {
                statusCode: status,
                message: exception.message,
                exceptionName: exception.name
            };
        }
        else if (exception instanceof QueryFailedError) {
            // tuto exception hadze TypeORM ak nezbehne nejake query
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            responseBody = {
                statusCode: status,
                message: exception.message,
                exceptionName: exception.name,
                sqlMessage: (exception as any).sqlMessage,
                sql: (exception as any).sql
            };
        }
        else if (exception instanceof Error) {
            // default (toto by mohlo ist aj v produkcii pre vsetky pripady)
            // tadeto ide aj AppError
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            responseBody = {
                statusCode: status,
                message: exception.message,
                exceptionName: exception.name
                //stacktrace: exception.stack
            };
            // AppError netreba logovat
            if (!(exception instanceof AppError)) {
                console.log(exception.stack);
            }
        }
        else {
            // exception typu string alebo number (throw 'nieco', resp. throw 300)
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            responseBody = {
                statusCode: status,
                message: exception,
                exceptionName: "Unknown exception (string/number)"
            };
        }

        console.log("ExceptionFilter responseBody = " + JSON.stringify(responseBody));

        response
            .status(status)
            .json(responseBody);
    }
}
