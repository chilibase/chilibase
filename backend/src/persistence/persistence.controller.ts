import {
    Body,
    Request,
    Controller,
    Post,
    Res, StreamableFile, UseGuards
} from '@nestjs/common';
import {PersistenceService} from "./persistence.service.js";
import type {FindResult} from "../common/FindResult.js";
import {LazyDataTableService} from "./lazy-data-table.service.js";
import {EntityMetadataService} from "../entity-metadata/entity-metadata.service.js";
import type {EntityMap} from "../common/EntityMetadata.js";
import type {FindParam, LazyAutoCompleteSuggestionsRequest} from "../common/FindParam.js";
import type {FindParamRowsForAssoc} from "./FindParamRowsForAssoc.js";
import type {SaveRowParam} from "./SaveRowParam.js";
import type {RemoveRowParam} from "./RemoveRowParam.js";
import type {BrowseMetaMap} from "../common/types.js";
import {BrowseFormMetadataService} from "../dynamic-browse/browse-form-metadata.service.js";
import type {Response} from 'express';
import type {ExportCsvParam, ExportExcelParam, ExportJsonParam} from "../common/ExportImportParam.js";
import type {LocalAuthLoginResponse, PostLoginRequest, PostLoginResponse} from "../common/auth-api.js";
import {LocalAuthGuard} from "../auth/local-auth.guard.js";
import {LocalAuthService} from "../auth/local-auth.service.js";
import {Public} from "../auth/public.js";
import type {
    FindRowByIdRequest,
    FindRowByIdResponse,
    GetSequenceValueRequest,
    GetSequenceValueResponse, UnlockRowRequest
} from "../common/lib-api.js";

@Controller()
export class PersistenceController {
    constructor(
        private readonly persistenceService: PersistenceService,
        private readonly lazyDataTableService: LazyDataTableService,
        private readonly entityMetadataService: EntityMetadataService,
        private readonly browseFormMetadataService: BrowseFormMetadataService,
        private readonly localAuthService: LocalAuthService) {}

    @Post('x-lazy-data-table-find-rows')
    async lazyDataTableFindRows(@Body() body: FindParam): Promise<FindResult> {
        const findResult: FindResult = await this.lazyDataTableService.findRows(body);
        return findResult;
    }

    @Post('x-lazy-data-table-export-excel')
    async lazyDataTableExportExcel(@Body() body: ExportExcelParam): Promise<StreamableFile> {
        // for Excel we do not use streams yet, maybe we will add it in the future (the exceljs library supports streams)
        return await this.lazyDataTableService.exportExcel(body);
    }

    @Post('x-lazy-data-table-export-csv')
    async lazyDataTableExportCsv(@Body() body: ExportCsvParam, @Res() res: Response) {
        // this is a use of express (a lower layer than nestjs) - Response is from express
        // more at https://docs.nestjs.com/controllers#getting-up-and-running
        // it is necessary to manage the response explicitly

        // we manage the response explicitly because we want to stream data into the response
        // the code is based on:
        // https://medium.com/developers-arena/streams-piping-and-their-error-handling-in-nodejs-c3fd818530b6
        // I do not know whether this will overflow memory... will the write method hang if the client does not consume the data?

        // the export method writes into "res"
        await this.lazyDataTableService.exportCsv(body, res);
    }

    @Post('x-lazy-data-table-export-json')
    async lazyDataTableExportJson(@Body() body: ExportJsonParam, @Res() res: Response) {
        // similarly to lazyDataTableExportCsv we support streams
        await this.lazyDataTableService.exportJson(body, res);
    }

    @Post('x-lazy-auto-complete-suggestions')
    lazyAutoCompleteSuggestions(@Body() body: LazyAutoCompleteSuggestionsRequest): Promise<FindResult> {
        return this.lazyDataTableService.lazyAutoCompleteSuggestions(body);
    }

    /**
     * @deprecated - use findRows
     */
    @Post('x-find-rows-for-assoc')
    async findRowsForAssoc(@Body() body: FindParamRowsForAssoc): Promise<any[]> {
        const rows: any[] = await this.persistenceService.findRowsForAssoc(body);
        return rows;
    }

    @Post('x-find-row-by-id')
    async findRowById(@Body() body: FindRowByIdRequest): Promise<FindRowByIdResponse> {
        return await this.lazyDataTableService.findRowById(body);
    }

    @Post('x-save-row')
    async saveRow(@Body() body: SaveRowParam): Promise<any> {
        return await this.persistenceService.saveRow(body);
    }

    @Post('x-unlock-row')
    async unlockRow(@Body() body: UnlockRowRequest) {
        await this.persistenceService.unlockRow(body);
    }

    @Post('x-remove-row')
    async removeRow(@Body() body: RemoveRowParam) {
//        try {
            await this.persistenceService.removeRow(body);
        // }
        // catch(error) {
        //     console.log("mame chybu *************");
        //     console.log(error);
        //     console.log(JSON.stringify(error));
        //     console.log(error.toString());
        //     console.log("*************");
        //     console.log(error.sqlMessage);
        //     console.log(error.sql);
        //     //throw new HttpException('*** Forbidden ***', HttpStatus.FORBIDDEN);
        //     throw error;
        // }
    }

    // old authentication
    // @Post('userAuthentication')
    // async userAuthentication(@Body() body: XUserAuthenticationRequest): Promise<XUserAuthenticationResponse> {
    //     return await this.persistenceService.userAuthentication(body);
    // }

    @Post('x-local-auth-change-password')
    async localAuthChangePassword(@Request() req: any, @Body() body: {passwordCurrent: string; passwordNew: string;}) {
        await this.localAuthService.changePassword(req.user, body);
    }

    @Public() // suppress JwtAuthGuard
    @UseGuards(LocalAuthGuard)
    @Post('x-local-auth-login')
    async localAuthLogin(@Request() req: any): Promise<LocalAuthLoginResponse> {
        // LocalAuthGuard invokes method LocalStrategy.validate that returns object XUser,
        // passport framework puts the object into "req.user" and the request pipeline continues with this method
        // we return jwt token that will be used by other requests invoked after login
        // (the other requests are "guarded" by JwtAuthGuard (associated with class JwtStrategy)
        return this.localAuthService.createJwtToken(req.user);
    }

    @Post('x-post-login')
    async postLogin(@Request() req: any, @Body() xPostLoginRequest: PostLoginRequest): Promise<PostLoginResponse> {
        return await this.persistenceService.postLogin(req.user, xPostLoginRequest);
    }

    @Post('x-user-save-row')
    async userSaveRow(@Body() body: SaveRowParam) {
        await this.persistenceService.userSaveRow(body);
    }

    // helper functions - maybe better XUtilsController

    @Post('x-get-sequence-value')
    async getSequenceValue(@Body() xGetSequenceValueRequest: GetSequenceValueRequest): Promise<GetSequenceValueResponse> {
        return {value: await this.persistenceService.getSequenceValue(xGetSequenceValueRequest.name)};
    }

    @Post('x-get-param-value')
    async getParamValue(@Body() request: {code: string;}): Promise<{value: string;}> {
        return {value: await this.persistenceService.getParamValue(request.code)};
    }

    @Post('x-get-entity-metadata-map')
    async getEntityMap(@Body() body: any): Promise<EntityMap> {
        //console.log("************************* called getEntityMap *******************************************");
        return this.entityMetadataService.getEntityMap();
    }

    @Post('x-get-browse-meta-map')
    async getXBrowseMetaMap(@Body() body: any): Promise<BrowseMetaMap> {
        //console.log("*********************** called getXBrowseMetaMap *****************************************");
        return this.browseFormMetadataService.getBrowseMetaMap();
    }
}
