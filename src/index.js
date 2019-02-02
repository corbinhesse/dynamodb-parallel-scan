const pMap = require('p-map');
const cloneDeep = require('lodash.clonedeep');
const times = require('lodash.times');
const {scan} = require('./ddb');

const debug = require('debug')('ddb-parallel-scan');

async function parallelScan(scanParams, {concurrency}) {
  const segments = times(concurrency);
  const docs = [];

  debug(`Started parallel scan with ${concurrency} threads`);

  await pMap(segments, async (_, segmentIndex) => {
    let ExclusiveStartKey = '';

    const params = cloneDeep(scanParams);
    params.Segment = segmentIndex;
    params.TotalSegments = concurrency;

    const now = Date.now();
    debug(`[${segmentIndex}/${concurrency}][start]`, {ExclusiveStartKey});

    do {
      if (ExclusiveStartKey) {
        params.ExclusiveStartKey = ExclusiveStartKey;
      }

      const {Items, LastEvaluatedKey} = await scan(params);
      ExclusiveStartKey = LastEvaluatedKey;

      docs.push(...Items);

      debug(
        `[${segmentIndex}/${concurrency}][done][time:${Date.now() - now}ms]` +
          `[fetched:${Items.length}][total:${docs.length}]`,
        {ExclusiveStartKey}
      );
    } while (ExclusiveStartKey);
  });

  debug(`Finished parallel scan with ${concurrency} threads. Fetched ${docs.length} items`);

  return docs;
}

module.exports = {
  parallelScan
};