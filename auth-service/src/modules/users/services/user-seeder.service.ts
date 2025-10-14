import { Injectable, Logger, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { UserFinderUtil } from '../../../common/utils/user-finder.util';
import { CreateUserService } from './create-user.service';
import { CASSANDRA_CLIENT } from '../../../database/cassandra.provider';
import { Client } from 'cassandra-driver';

@Injectable()
export class UserSeederService implements OnApplicationBootstrap {
    private readonly logger = new Logger(UserSeederService.name);

    constructor(
        private readonly userFinder: UserFinderUtil,
        private readonly createUserService: CreateUserService,
        @Inject(CASSANDRA_CLIENT) private readonly cassandraClient: Client,
    ) {}

    async onApplicationBootstrap() {
        this.logger.log('Running admin user seeder...');
        try {
            const adminUser = await this.userFinder.findByCedula('admin');

            if (!adminUser) {
                this.logger.log('Admin user not found, creating one...');
                await this.createUserService.create({
                    cedula: 'admin',
                    name: 'Admin User',
                    password: 'admin123',
                });
                this.logger.log('Default admin user created successfully.');

                // --- FIX: Grant all necessary permissions to the new admin user ---
                const permissionsToGrant = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'CREATE TABLE', 'TRUNCATE TABLE'];
                const insertPermissionsQuery = `
          INSERT INTO permissions (cedula, operaciones) 
          VALUES (?, ?);
        `;
                await this.cassandraClient.execute(insertPermissionsQuery, ['admin', permissionsToGrant], { prepare: true });
                this.logger.log(`Granted all initial permissions to 'admin' user.`);

            } else {
                this.logger.log('Admin user already exists. Seeder is not needed.');
            }
        } catch (error) {
            if (error.message.includes('already exists')) {
                this.logger.warn('Race condition during seeding: Admin user was created by another instance.');
            } else {
                this.logger.error('Error during admin user seeding:', error.stack);
            }
        }
    }
}

