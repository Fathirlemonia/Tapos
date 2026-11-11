const { EventEmitter } = require('node:events');

const eventBus = new EventEmitter();

eventBus.setMaxListeners(0);

function publish(type, payload) {
  eventBus.emit('event', {
    type,
    payload,
    occurredAt: new Date().toISOString()
  });
}

module.exports = { eventBus, publish };
