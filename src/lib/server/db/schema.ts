import { pgTable, serial, text, timestamp, integer, uuid, index, real, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const accessaryTypeEnum = pgEnum('accessary_type', ['reflector', 'fresnel']);
export const colorTypeEnum = pgEnum('color_type', ['Single', 'Bi', 'Color']);
export const lightEngineEnum = pgEnum('light_engine', ['W', 'Bi', 'Bi+RGB', 'RGBWW', 'RGBACL', 'BLAIR', 'BLAIR-CG']);
export const formFactorEnum = pgEnum('form_factor', ['Point Source', 'Panel', 'Mat', 'Bulb', 'Tube']);
export const sizeEnum = pgEnum('size', ['Tiny', 'Small', 'Medium', 'Large']);
export const platformTypeEnum = pgEnum('platform_type', ['bilibili', 'zhihu', 'douyin', 'youtube', 'facebook', 'instagram', 'email']);


// Users table
export const user = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	username: text('username').notNull().unique(), // For login
	nickname: text('nickname').notNull(), // For display
	email: text('email').notNull().unique(), // Company Email
	passwordHash: text('password_hash').notNull(), // argon2id
	permission: integer('permission').notNull(), // Bitmask: bit 0=Light, bit 1=Camera, bit 2=Lens
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
  }, (table) => [
	index('users_username_idx').on(table.username),
	index('users_email_idx').on(table.email),
	index('users_permission_idx').on(table.permission),
  ]);

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// User public info table
export const userPublicInfo = pgTable('user_public_info', {
	id: serial('id').primaryKey(),
	userId: uuid('user_id').references(() => user.id).notNull(),
	platform: platformTypeEnum('platform').notNull(),
	link: text('link').notNull(), // varchar(1024) equivalent
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
	index('user_public_info_user_id_idx').on(table.userId),
	index('user_public_info_platform_idx').on(table.platform),
]);

// Brand table
export const brands = pgTable('brands', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(), // English name of the brand
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
  }, (table) => [
	index('brands_name_idx').on(table.name),
  ]);
  
  // Product type table
  export const productTypes = pgTable('product_types', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(), // English name of the product type
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
  }, (table) => [
	index('product_types_name_idx').on(table.name),
  ]);
  
  // Product series table
  export const productSeries = pgTable('product_series', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(), // English name of the product series
	brandId: integer('brand_id').references(() => brands.id).notNull(),
	productTypeId: integer('product_type_id').references(() => productTypes.id).notNull(),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
  }, (table) => [
	index('product_series_name_idx').on(table.name),
	index('product_series_brand_id_idx').on(table.brandId),
	index('product_series_product_type_id_idx').on(table.productTypeId),
  ]);
  
  // Product light table (merged from products + product_light_info)
  export const productLight = pgTable('product_light', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(), // English name of the product
	seriesId: integer('series_id').references(() => productSeries.id).notNull(),
	colorType: colorTypeEnum('color_type').notNull(), // Single, Bi, Color
	minCct: integer('min_cct'), // Minimum CCT (include extended CCT range)
	maxCct: integer('max_cct'), // Maximum CCT (include extended CCT range)
	lightEngine: lightEngineEnum('light_engine').notNull(), // W, WW, Bi+RGB, RGBWW, RGBACL/RGBLAC, BLAIR, BLAIR-CG
	formFactor: formFactorEnum('form_factor').notNull(), // Point Source, Panel, Mat, Bulb, Tube
	designPowerInput: integer('design_power_input'), // Input to this if I/O not specified
	designPowerOutput: integer('design_power_output'), // Skip this if I/O not specified
	size: sizeEnum('size').notNull(), // Tiny, Small, Medium, Large
	modesAvailable: integer('modes_available').notNull().default(0), // Bitmask: bit 0=Tungsten, bit 1=Daylight, bit 2=S-curve, bit 3=Log, bit 4=Exp, bit 5=0.1% dimming, bit 6=Silent mode
	weight: real('weight'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
  }, (table) => [
	index('product_light_name_idx').on(table.name),
	index('product_light_series_id_idx').on(table.seriesId),
	index('product_light_color_type_idx').on(table.colorType),
	index('product_light_light_engine_idx').on(table.lightEngine),
	index('product_light_form_factor_idx').on(table.formFactor),
	index('product_light_size_idx').on(table.size),
  ]);
  
  // Product light accessory table (merged from products + product_light_accessary_info)
  export const productLightAccessary = pgTable('product_light_accessary', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(), // English name of the product
	seriesId: integer('series_id').references(() => productSeries.id).notNull(),
	accessaryType: accessaryTypeEnum('accessary_type').notNull(), // reflector, fresnel
	minAngle: real('min_angle'), // minimum angle for fresnel
	maxAngle: real('max_angle'), // maximum angle for fresnel
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
  }, (table) => [
	index('product_light_accessary_name_idx').on(table.name),
	index('product_light_accessary_series_id_idx').on(table.seriesId),
	index('product_light_accessary_accessary_type_idx').on(table.accessaryType),
  ]);
  
  // Benchmark light white table
  export const benchmarkLightWhite = pgTable('benchmark_light_white', {
	id: serial('id').primaryKey(),
	productId: integer('product_id').references(() => productLight.id).notNull(), // product_light.id
	userId: uuid('user_id').references(() => user.id).notNull(), // user who performed the benchmark
	setInt: real('set_int').notNull(), // Intensity (%)
	setCct: integer('set_cct').notNull(), // CCT (K)
	setGm: real('set_gm').notNull().default(0), // Tone +: G, -: M(%)
	accessary: integer('accessary'), // product_light_accessary.id
	beamAngle: real('beam_angle'), // self/reflector/fresnel beam angle
	inputPower: real('input_power'), // actual power
	actCct: real('act_cct'), // Field Type
	actDuv: real('act_duv'), // Field Type
	illuminance: real('illuminance'), // lux
	illuminanceDistance: real('illuminance_distance'), // distance
	illuminanceDistanceUnit: text('illuminance_distance_unit'), // m, ft
	cri: real('cri'), // CRI Field
	criR9: real('cri_r9'), // CRI_R9 Field
	tlci: real('tlci'), // TLCI Field
	cqs56: real('cqs_56'), // CQS_56 Field
	cqs32: real('cqs_32'), // CQS_32 Field
	ssi56: real('ssi_56'), // SSI_56 Field
	ssi32: real('ssi_32'), // SSI_32 Field
	tm30Rf: real('tm30_rf'), // TM30_RF Field
	tm30Rg: real('tm30_rg'), // TM30_RG Field
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
  }, (table) => [
	index('benchmark_light_white_product_id_idx').on(table.productId),
	index('benchmark_light_white_user_id_idx').on(table.userId),
	index('benchmark_light_white_set_cct_idx').on(table.setCct),
	index('benchmark_light_white_set_int_idx').on(table.setInt),
	index('benchmark_light_white_accessary_idx').on(table.accessary),
  ]);
  
  // Define relations
  export const usersRelations = relations(user, ({ many }) => ({
	benchmarkLightWhite: many(benchmarkLightWhite),
	userPublicInfo: many(userPublicInfo),
  }));
  
  export const brandsRelations = relations(brands, ({ many }) => ({
	productSeries: many(productSeries),
  }));
  
  export const productTypesRelations = relations(productTypes, ({ many }) => ({
	productSeries: many(productSeries),
  }));
  
  export const productSeriesRelations = relations(productSeries, ({ one, many }) => ({
	brand: one(brands, {
	  fields: [productSeries.brandId],
	  references: [brands.id],
	}),
	productType: one(productTypes, {
	  fields: [productSeries.productTypeId],
	  references: [productTypes.id],
	}),
	productLights: many(productLight),
	productLightAccessaries: many(productLightAccessary),
  }));
  
  export const productLightRelations = relations(productLight, ({ one, many }) => ({
	series: one(productSeries, {
	  fields: [productLight.seriesId],
	  references: [productSeries.id],
	}),
	benchmarkLightWhite: many(benchmarkLightWhite),
  }));
  
  export const productLightAccessaryRelations = relations(productLightAccessary, ({ one, many }) => ({
	series: one(productSeries, {
	  fields: [productLightAccessary.seriesId],
	  references: [productSeries.id],
	}),
  }));
  
  export const benchmarkLightWhiteRelations = relations(benchmarkLightWhite, ({ one }) => ({
	product: one(productLight, {
	  fields: [benchmarkLightWhite.productId],
	  references: [productLight.id],
	}),
	user: one(user, {
	  fields: [benchmarkLightWhite.userId],
	  references: [user.id],
	}),
	accessary: one(productLightAccessary, {
	  fields: [benchmarkLightWhite.accessary],
	  references: [productLightAccessary.id],
	}),
  }));
  
  export const userPublicInfoRelations = relations(userPublicInfo, ({ one }) => ({
	user: one(user, {
	  fields: [userPublicInfo.userId],
	  references: [user.id],
	}),
  }));
  
  // Export types for use in the application
  export type User = typeof user.$inferSelect;
  export type NewUser = typeof user.$inferInsert;
  export type UserPublicInfo = typeof userPublicInfo.$inferSelect;
  export type NewUserPublicInfo = typeof userPublicInfo.$inferInsert;
  export type Brand = typeof brands.$inferSelect;
  export type NewBrand = typeof brands.$inferInsert;
  export type ProductType = typeof productTypes.$inferSelect;
  export type NewProductType = typeof productTypes.$inferInsert;
  export type ProductSeries = typeof productSeries.$inferSelect;
  export type NewProductSeries = typeof productSeries.$inferInsert;
  export type ProductLight = typeof productLight.$inferSelect;
  export type NewProductLight = typeof productLight.$inferInsert;
  export type ProductLightAccessary = typeof productLightAccessary.$inferSelect;
  export type NewProductLightAccessary = typeof productLightAccessary.$inferInsert;
  export type BenchmarkLightWhite = typeof benchmarkLightWhite.$inferSelect;
  export type NewBenchmarkLightWhite = typeof benchmarkLightWhite.$inferInsert;
  