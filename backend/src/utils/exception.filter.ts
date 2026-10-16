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
            // TypeORM throws this exception if some query fails
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
            // default (this could also be used in production for all cases)
            // AppError also goes through here
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            responseBody = {
                statusCode: status,
                message: exception.message,
                exceptionName: exception.name
                //stacktrace: exception.stack
            };
            // AppError does not need to be logged
            if (!(exception instanceof AppError)) {
                console.log(exception.stack);
            }
        }
        else {
            // exception of type string or number (throw 'something', or throw 300)
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
