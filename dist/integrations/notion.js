"use strict";
/**
 * Notion Integration - Pages, databases, and content management
 */
class NotionIntegration {
    constructor(apiKey, config = {}) {
        this.apiKey = apiKey || process.env.NOTION_API_KEY;
        this.baseUrl = 'https://api.notion.com/v1';
        this.version = config.version || '2022-06-28';
    }

    async _request(endpoint, options = {}) {
        const resp = await fetch(this.baseUrl + endpoint, {
            method: options.method || 'GET',
            headers: {
                'Authorization': 'Bearer ' + this.apiKey,
                'Notion-Version': this.version,
                'Content-Type': 'application/json',
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        return resp.json();
    }

    // Pages
    async createPage(parent, properties, children = []) {
        return this._request('/pages', {
            method: 'POST',
            body: { parent, properties, children },
        });
    }

    async getPage(pageId) {
        return this._request('/pages/' + pageId);
    }

    async updatePage(pageId, properties) {
        return this._request('/pages/' + pageId, {
            method: 'PATCH',
            body: { properties },
        });
    }

    async deletePage(pageId) {
        return this._request('/pages/' + pageId, {
            method: 'PATCH',
            body: { archived: true },
        });
    }

    // Databases
    async queryDatabase(databaseId, filter = {}, sorts = []) {
        return this._request('/databases/' + databaseId + '/query', {
            method: 'POST',
            body: { filter, sorts },
        });
    }

    async createDatabase(parent, title, properties) {
        return this._request('/databases', {
            method: 'POST',
            body: { parent, title, properties },
        });
    }

    async getDatabase(databaseId) {
        return this._request('/databases/' + databaseId);
    }

    // Blocks
    async getBlockChildren(blockId, pageSize = 100) {
        return this._request('/blocks/' + blockId + '/children?page_size=' + pageSize);
    }

    async appendBlockChildren(blockId, children) {
        return this._request('/blocks/' + blockId + '/children', {
            method: 'PATCH',
            body: { children },
        });
    }

    // Search
    async search(query, filter = {}) {
        return this._request('/search', {
            method: 'POST',
            body: { query, filter },
        });
    }
}

module.exports = { NotionIntegration };
