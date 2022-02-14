import { existsSync, readFileSync } from 'fs';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { isNotEmptyString } from '@rnw-community/shared';

import type { EnvType } from './env.type';

/* eslint-disable class-methods-use-this */
@Injectable()
export class ApiConfigService<EnvTypes extends Record<string, string>, EnvKeys extends Extract<keyof EnvTypes, string>> {
    private readonly envCache = new Map();

    constructor(private readonly config: ConfigService<EnvTypes>) {}

    public get<T extends EnvKeys>(envVariable: T): EnvType<EnvTypes, T> {
        if (this.envCache.has(envVariable)) {
            const value = this.envCache.get(envVariable) as EnvType<EnvTypes, T>;
            Logger.log(`Using env variable "${envVariable}" from cache`, ApiConfigService.name);

            return value;
        }

        const variableValue = this.config.get<EnvType<EnvTypes, T>>(envVariable);

        if (envVariable.includes('_FILE')) {
            const fileEnvValue = this.handleFileEnvVariable(envVariable, variableValue);
            this.envCache.set(envVariable, fileEnvValue);

            return fileEnvValue;
        }

        this.envCache.set(envVariable, variableValue);
        Logger.log(`Using env variable "${envVariable}" = "${variableValue as string}"`, ApiConfigService.name);

        return variableValue as unknown as EnvType<EnvTypes, T>;
    }

    private handleFileEnvVariable<T extends EnvKeys>(envVariable: T, filePath?: EnvType<EnvTypes, T>): EnvType<EnvTypes, T> {
        if (isNotEmptyString(filePath)) {
            Logger.log(`Using env variable "${envVariable}" from file "${filePath}"`, ApiConfigService.name);

            return this.readFileEnvFromFS<T>(envVariable, filePath);
        }

        return this.readFileEnvFromEnvironment<T>(envVariable);
    }

    private readFileEnvFromEnvironment<T extends EnvKeys>(envVariable: T): EnvType<EnvTypes, T> {
        const value = process.env[envVariable.replace('_FILE', '')] as EnvType<EnvTypes, T>;

        Logger.log(`Using env variable "${envVariable}" from environment "${value}"`, ApiConfigService.name);

        return value;
    }

    private readFileEnvFromFS<T extends EnvKeys>(envVariable: T, variableValue: EnvType<EnvTypes, T>): EnvType<EnvTypes, T> {
        if (!existsSync(variableValue as string)) {
            throw new Error(`Could not read file ${envVariable} - ${variableValue}`);
        }

        return readFileSync(variableValue).toString().trim() as EnvType<EnvTypes, T>;
    }
}
