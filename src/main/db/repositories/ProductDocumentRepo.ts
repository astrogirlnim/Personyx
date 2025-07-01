/**
 * Product Document Repository - CRUD operations for product documents
 * Repository pattern for clean data access layer
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '@main/db/connection';
import {
  productDocuments,
  type ProductDocument,
  type NewProductDocument,
} from '@main/db/schema';
import { Logger } from '@main/utils/logger';

const logger = new Logger('product-document-repo');

export class ProductDocumentRepo {
  /**
   * Create new product document
   */
  async create(
    data: Omit<NewProductDocument, 'id' | 'uploadedAt' | 'lastModified'>
  ): Promise<ProductDocument> {
    try {
      logger.info('➕ Creating new product document', {
        title: data.title,
        type: data.type,
      });

      const db = getDatabase();
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newDocument: NewProductDocument = {
        id: documentId,
        title: data.title,
        content: data.content,
        filePath: data.filePath,
        type: data.type,
        evidenceScore: data.evidenceScore,
      };

      await db.insert(productDocuments).values(newDocument);

      // Retrieve the created document
      const created = await this.findById(documentId);
      if (!created) {
        throw new Error('Failed to retrieve created product document');
      }

      logger.info('✅ Product document created successfully', {
        id: documentId,
        title: data.title,
      });
      return created;
    } catch (error) {
      logger.error('❌ Failed to create product document', error);
      throw error;
    }
  }

  /**
   * Find product document by ID
   */
  async findById(id: string): Promise<ProductDocument | null> {
    try {
      logger.debug('🔍 Finding product document by ID', { id });

      const db = getDatabase();
      const result = await db
        .select()
        .from(productDocuments)
        .where(eq(productDocuments.id, id))
        .limit(1);

      if (result.length === 0) {
        logger.debug('📭 Product document not found', { id });
        return null;
      }

      const document = result[0];
      logger.debug('✅ Product document found', { id, title: document.title });
      return document;
    } catch (error) {
      logger.error('❌ Failed to find product document by ID', error);
      throw error;
    }
  }

  /**
   * List all product documents
   */
  async list(): Promise<ProductDocument[]> {
    try {
      logger.debug('📋 Listing all product documents');

      const db = getDatabase();
      const result = await db.select().from(productDocuments);

      logger.debug(`✅ Found ${result.length} product documents`);
      return result;
    } catch (error) {
      logger.error('❌ Failed to list product documents', error);
      throw error;
    }
  }

  /**
   * Update product document
   */
  async update(
    id: string,
    data: Partial<Omit<NewProductDocument, 'id' | 'uploadedAt'>>
  ): Promise<ProductDocument | null> {
    try {
      logger.info('📝 Updating product document', {
        id,
        fields: Object.keys(data),
      });

      const db = getDatabase();

      // Add lastModified timestamp
      const updateData = {
        ...data,
        lastModified: new Date(),
      };

      await db
        .update(productDocuments)
        .set(updateData)
        .where(eq(productDocuments.id, id));

      // Retrieve updated document
      const updated = await this.findById(id);

      if (updated) {
        logger.info('✅ Product document updated successfully', {
          id,
          title: updated.title,
        });
      } else {
        logger.warn('⚠️ Product document not found after update', { id });
      }

      return updated;
    } catch (error) {
      logger.error('❌ Failed to update product document', error);
      throw error;
    }
  }

  /**
   * Delete product document
   */
  async delete(id: string): Promise<boolean> {
    try {
      logger.info('🗑️ Deleting product document', { id });

      const db = getDatabase();
      const result = await db
        .delete(productDocuments)
        .where(eq(productDocuments.id, id));

      const deleted = result.changes > 0;

      if (deleted) {
        logger.info('✅ Product document deleted successfully', { id });
      } else {
        logger.warn('⚠️ Product document not found for deletion', { id });
      }

      return deleted;
    } catch (error) {
      logger.error('❌ Failed to delete product document', error);
      throw error;
    }
  }

  /**
   * Find documents by type
   */
  async findByType(
    type: 'prd' | 'requirements' | 'spec'
  ): Promise<ProductDocument[]> {
    try {
      logger.debug('🔍 Finding documents by type', { type });

      const db = getDatabase();
      const result = await db
        .select()
        .from(productDocuments)
        .where(eq(productDocuments.type, type));

      logger.debug(`✅ Found ${result.length} documents of type`, { type });
      return result;
    } catch (error) {
      logger.error('❌ Failed to find documents by type', error);
      throw error;
    }
  }

  /**
   * Update evidence score for a document
   */
  async updateEvidenceScore(id: string, score: number): Promise<boolean> {
    try {
      logger.info('📊 Updating evidence score for document', { id, score });

      const db = getDatabase();
      const result = await db
        .update(productDocuments)
        .set({
          evidenceScore: score,
          lastModified: new Date(),
        })
        .where(eq(productDocuments.id, id));

      const updated = result.changes > 0;

      if (updated) {
        logger.info('✅ Evidence score updated successfully', { id, score });
      } else {
        logger.warn('⚠️ Document not found for evidence score update', { id });
      }

      return updated;
    } catch (error) {
      logger.error('❌ Failed to update evidence score', error);
      throw error;
    }
  }

  /**
   * Get document count
   */
  async count(): Promise<number> {
    try {
      logger.debug('🔢 Counting product documents');

      const documents = await this.list();
      const count = documents.length;

      logger.debug(`✅ Product document count: ${count}`);
      return count;
    } catch (error) {
      logger.error('❌ Failed to count product documents', error);
      throw error;
    }
  }
}
