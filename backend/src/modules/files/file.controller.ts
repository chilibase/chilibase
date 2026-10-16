import {Body, Controller, Post, StreamableFile, UploadedFile, UseInterceptors} from "@nestjs/common";
import {FileService} from "./file.service.js";
import {createReadStream, existsSync, mkdirSync, renameSync} from "fs";
import {Readable} from "stream";
import {Utils} from "../../utils/Utils.js";
import {FileMeta} from "./file-meta.entity.js";
import {FileInterceptor} from "@nestjs/platform-express";
// without this import, we get TS2694: Namespace global.Express has no exported member Multer
import type {} from "multer";
import {join} from "path";
import {FileJsonField} from "../../common/lib-api.js";

@Controller()
export class FileController {
    constructor(
        private readonly fileService: FileService) {
    }

    // the uploaded file is saved into the file system in the directory 'app-files/uploaded/'
    @Post('x-upload-file-into-file-system')
    @UseInterceptors(FileInterceptor('fileField', {dest: 'app-files/uploaded/'}))
    async uploadFileIntoFileSystem(@Body() body: any, @UploadedFile() file: Express.Multer.File/*, @Res() res: Response*/): Promise<FileMeta> {

        // body.jsonField is a string, it has to be explicitly converted to an object, it does not work even when I specify the type for "body"
        const jsonField: FileJsonField = JSON.parse(body.jsonField);

        // we insert a FileMeta record and return it
        // file.originalname has bad diacritics, so we take the filename from the json
        // pathName is created from the id, so we fill it in later - TODO - obtain the new id and run only an insert
        const filename: string = jsonField.filename;
        const fileMeta: FileMeta = await this.fileService.saveFileMeta({
            id: undefined,
            name: filename,
            size: file.size,
            pathName: null,
            data: null,
            modifDate: jsonField.modifDate,
            modifUser: jsonField.modifUser
        });

        // we save the file into the directory app-files/x-files/<jsonField.filepath>
        let destPath: string = Utils.getXFilesDir();
        // the x-files directory should already exist
        // if (!existsSync(destPath)){
        //     mkdirSync(destPath);
        // }

        // we add the id to the file name so that we can also save 2 files with the same name
        const filenameWithId: string = 'id-' + fileMeta.id + '-' + filename;
        let pathName: string = filenameWithId;
        if (jsonField.subdir) {
            pathName = join(jsonField.subdir, pathName);
            destPath = join(destPath, jsonField.subdir);
            // TODO - adjust it so that it also works when jsonField.filepath consists of more than one directory (mkdirSync can create only 1 directory)
            if (!existsSync(destPath)){
                mkdirSync(destPath);
            }
        }

        destPath = join(destPath, filenameWithId);

        // now we have e.g.:
        // destPath: app-files/x-files/<jsonField.filepath>/id-123-fileXYZ.pdf
        // pathName:                   <jsonField.filepath>/id-123-fileXYZ.pdf

        renameSync(file.path, destPath);

        // we write destPath into the DB
        fileMeta.pathName = pathName;
        await this.fileService.saveFileMeta(fileMeta);

        return fileMeta;
    }

    // no directory is specified in FileInterceptor, the uploaded file is saved into memory (into file.buffer)
    @Post('x-upload-file-into-db')
    @UseInterceptors(FileInterceptor('fileField'))
    uploadFileIntoDb(@Body() body: any, @UploadedFile() file: Express.Multer.File/*, @Res() res: Response*/): Promise<FileMeta> {

        // body.jsonField is a string, it has to be explicitly converted to an object, it does not work even when I specify the type for "body"
        const jsonField: FileJsonField = JSON.parse(body.jsonField);

        // we insert a FileMeta record and return it
        // file.originalname has bad diacritics, so we take the filename from the json field
        return this.fileService.saveFileMeta({
            id: undefined,
            name: jsonField.filename,
            size: file.buffer.byteLength,
            pathName: null,
            data: file.buffer,
            modifDate: jsonField.modifDate,
            modifUser: jsonField.modifUser
        });
    }

    @Post('x-download-file')
    async downloadFile(@Body() body: {fileMetaId: number;}/*, @Res({ passthrough: true }) response: Response*/): Promise<StreamableFile> {

        const fileMeta: FileMeta = await this.fileService.readFileMetaByIdWithData(body.fileMetaId);

        let readable: Readable;
        if (fileMeta.pathName) {
            // we read the file from the directory app-files/x-files/<fileMeta.pathName>
            let destPath: string = join(Utils.getXFilesDir(), fileMeta.pathName);
            readable = createReadStream(destPath);
        }
        else {
            readable = Readable.from(fileMeta.data);
        }

        // the goal of this is to write the file under the correct name when saving in the browser
        // it did not work for me, I had to write the file name on the client
        // response.set({
        //   'Content-Disposition': `inline; filename="${fileMeta.filename}"`,
        //   'Content-Type': 'image'
        // })

        return new StreamableFile(readable);
    }
}
