type Utils<T> = {
    [key: string]: (...args: any[]) => any;
}

export interface StepMigration<C, T extends Utils<any>> {
    version: number;
    name: string;
    up: (connection: C) => { run: () => Promise<void>, utils: T };
}

const debug = (message: string) => console.debug(`${message}`)

export class Migration<T = {}, C = any> {
    #utilsReady: Promise<T> = Promise.resolve<any>({});

    constructor(readonly options: {
        getVersion: () => Promise<number>,
        putVersion: (version: number, name?: string) => Promise<void>,
        connection: C
    }) { }

    get migrated() {
        return this.#utilsReady;
    }

    async run() {
        const promise = this.#utilsReady ?? Promise.resolve<{}>({});
        const r = await promise;
        return r;
    }

    async currentVersion() {
        return await this.options.getVersion();
    }

    next<A extends Utils<any>>(migration: StepMigration<C, A>): Migration<
        T & A,
        C
    > {
        const nextUtils = this.#utilsReady.then(async (utils): Promise<A> => {
            const currentVersion = await this.options.getVersion();
            const { run, utils: nextUtils } = migration.up(this.options.connection);

            if (currentVersion < migration.version) {
                debug(`Running migration ${migration.name} version ${migration.version}`);
                await run()
                await this.options.putVersion(migration.version, migration.name);
            }

            return {
                ...utils,
                ...nextUtils,
            };
        });
        const nextMigration = new Migration<any>(this.options);
        nextMigration.#utilsReady = nextUtils;
        return nextMigration;
    }
}