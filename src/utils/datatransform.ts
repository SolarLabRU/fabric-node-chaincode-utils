import { Iterators } from 'fabric-shim';
import { KeyModificationItem, KV } from '../index';
import { Helpers } from './helpers';
import { LoggerInstance } from 'winston';

/**
 * The Transform class is a helper to provide data transformation to and from the formats required by hyperledger fabric.
 */
export class Transform {
    public static logger: LoggerInstance = Helpers.getLoggerInstance('Transform', 'info');

    /**
     * serialize payload
     *
     * @static
     * @param {*} value
     * @returns
     * @memberof Transform
     */
    public static serialize(value: any) {
        if (value instanceof Buffer) {
            return value;
        } else if (this.isDate(value) || this.isString(value)) {
            return Buffer.from(this.normalizePayload(value).toString());
        }

        return Buffer.from(JSON.stringify(this.normalizePayload(value)));
    }

    /**
     * parse string to object
     *
     * @static
     * @param {Buffer} buffer
     * @returns {(object | undefined)}
     * @memberof Transform
     */
    public static bufferToObject(buffer: Buffer): object | string {
        if (buffer == null) {
            return null;
        }

        if (Number(parseFloat(buffer.toString())) === (buffer as any)) {
            return buffer;
        }

        const bufferString = buffer.toString('utf8');

        if (bufferString.length <= 0) {
            return null;
        }

        try {
            return JSON.parse(bufferString);
        } catch (err) {
            this.logger.error('Error parsing buffer to JSON', bufferString);
            return bufferString;
        }
    }

    /**
     * bufferToDate
     *
     * @static
     * @param {Buffer} buffer
     * @returns {(Date | undefined)}
     * @memberof Transform
     */
    public static bufferToDate(buffer: Buffer): Date | undefined {
        if (buffer == null) {
            return null;
        }

        const bufferString = buffer.toString();
        if (bufferString.length <= 0) {

            return null;
        }

        if (/\d+/g.test(bufferString)) {

            return new Date(parseInt(bufferString, 10));
        }

        return null;
    }

    public static bufferToString(buffer: Buffer): string | undefined {
        if (buffer == null) {
            return null;
        }

        return buffer.toString();
    }

    /**
     * Transform iterator to array of objects
     *
     * @param {'fabric-shim'.Iterators.CommonIterator} iterator
     * @returns {Promise<Array>}
     */
    public static async iteratorToList(iterator: Iterators.CommonIterator) {
        const allResults = [];

        let res: Iterators.NextResult;
        while (res == null || !res.done) {
            res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                let parsedItem: any;

                try {
                    parsedItem = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    parsedItem = res.value.value.toString('utf8');
                }
                allResults.push(parsedItem);
            }
        }

        await iterator.close();

        return allResults;
    }

    /**
     * Transform iterator to array of objects
     *
     * @param {'fabric-shim'.Iterators.CommonIterator} iterator
     * @returns {Promise<Array>}
     */
    public static async iteratorToKVList(iterator: Iterators.CommonIterator): Promise<KV[]> {
        const allResults = [];

        let res: Iterators.NextResult;
        while (res == null || !res.done) {
            res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                let parsedItem: KV = { key: '', value: {} };

                parsedItem.key = res.value.key;

                try {
                    parsedItem.value = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    parsedItem.value = res.value.value.toString('utf8');
                }
                allResults.push(parsedItem);
            }
        }

        await iterator.close();

        return allResults;
    }

    /**
     * Transform iterator to array of objects
     *
     * @param {Iterators.HistoryQueryIterator} iterator
     * @returns {Promise<Array>}
     */
    public static async iteratorToHistoryList(iterator: Iterators.HistoryQueryIterator): Promise<KeyModificationItem[]> {
        const allResults = [];

        let res: Iterators.NextKeyModificationResult;
        while (res == null || !res.done) {
            res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                let parsedItem: KeyModificationItem = {
                    is_delete: false,
                    value: {},
                    timestamp: null,
                    tx_id: ''
                };

                try {
                    parsedItem.value = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    parsedItem.value = res.value.value.toString('utf8');
                }

                parsedItem.is_delete = res.value.is_delete;
                parsedItem.tx_id = res.value.tx_id;
                parsedItem.timestamp = res.value.timestamp.getSeconds();

                allResults.push(parsedItem);
            }
        }

        await iterator.close();

        return allResults;
    }

    /**
     * normalizePayload
     *
     * @static
     * @param {*} value
     * @returns {*}
     * @memberof Transform
     */
    public static normalizePayload(value: any): any {
        if (value === null) {
            return value;
        } else if (this.isDate(value)) {
            return value.getTime();
        } else if (this.isString(value)) {
            return value;
        } else if (Array.isArray(value)) {
            return value.map(v => this.normalizePayload(v));
        } else if (this.isObject(value)) {
            return Object.entries(value)
                .reduce((a, [key, v]) => {
                    a[key] = this.normalizePayload(v);
                    return a;
                }, {});
        }

        return value;
    }

    static isDate(date: any) {
        return date && Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date);
    }

    static isString(data: any) {
        return data && (typeof data === 'string' || data instanceof String);
    }

    static isObject(data: any) {
        return data !== null && typeof data === 'object';
    }
}
