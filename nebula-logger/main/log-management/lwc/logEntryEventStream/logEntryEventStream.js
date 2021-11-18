import { LightningElement } from 'lwc';
import { isEmpEnabled, subscribe, unsubscribe } from 'lightning/empApi';

export default class LogEntryEventStream extends LightningElement {
    unfilteredEvents = [];
    logEntryEvents = [];
    isExpanded = false;
    isStreamEnabled = true;

    // Filters
    loggedByFilter;
    loggingLevelFilter;
    messageFilter;
    originTypeFilter;
    originLocationFilter;
    scenarioFilter;
    maxEvents = 50;

    _channel = '/event/LogEntryEvent__e'; // TODO need to support namespace in managed package
    _subscription = {};

    get title() {
        let logEntryString = ' Log Entry Events';
        let startingTitle = this.logEntryEvents.length + logEntryString;
        if (this.unfilteredEvents.length !== this.logEntryEvents.length) {
            startingTitle = this.logEntryEvents.length + ' matching results out of ' + this.unfilteredEvents.length + logEntryString;
        }
        return startingTitle;
    }

    get streamButtonVariant() {
        return this.isStreamEnabled ? 'success' : 'brand';
    }

    get loggingLevelOptions() {
        return [
            { label: '--SELECT--', value: '' },
            { label: 'ERROR', value: '8' },
            { label: 'WARN', value: '7' },
            { label: 'INFO', value: '6' },
            { label: 'DEBUG', value: '5' },
            { label: 'FINE', value: '4' },
            { label: 'FINER', value: '3' },
            { label: 'FINEST', value: '2' }
        ];
    }

    get originTypeOptions() {
        return [
            { label: '--SELECT--', value: '' },
            { label: 'Apex', value: 'Apex' },
            { label: 'Component', value: 'Component' },
            { label: 'Flow', value: 'Flow' }
        ];
    }

    async connectedCallback() {
        document.title = 'Log Entry Event Stream';
        if (isEmpEnabled()) {
            this.createSubscription();
        }
    }

    disconnectedCallback() {
        this.cancelSubscription();
    }

    createSubscription() {
        subscribe(this._channel, -1, this.subscriptionCallback).then(response => {
            this._subscription = response;
        });
    }

    cancelSubscription() {
        unsubscribe(this._subscription);
    }

    handleFilterChange(event) {
        this[event.target.dataset.id] = event.target.value;
        this._filterEvents();
    }

    handleMaxEventsChange(event) {
        this.maxEvents = event.target.value;
    }

    onClear() {
        this.logEntryEvents = [];
        this.unfilteredEvents = [];
    }

    // onToggleExpand() {
    //     let consoleBlock = this.template.querySelector('[data-id="event-stream-console"]');
    //     consoleBlock.className = this.isExpanded ? '' : 'expanded';
    //     this.isExpanded = !this.isExpanded;
    // }

    onToggleStream() {
        this.isStreamEnabled = !this.isStreamEnabled;
        // eslint-disable-next-line
        this.isStreamEnabled ? this.createSubscription() : this.cancelSubscription();
    }

    subscriptionCallback = response => {
        const logEntryEvent = response.data.payload;
        // As of API v52.0 (Summer '21), platform events have a unique field, EventUUID
        // but it doesn't seem to be populated via empApi, so use a synthetic key instead
        logEntryEvent.key = logEntryEvent.TransactionId__c + '__' + logEntryEvent.TransactionEntryNumber__c;
        this.unfilteredEvents.unshift(logEntryEvent);
        this._filterEvents();
    };

    // Private functions
    _filterEvents() {
        while (this.unfilteredEvents.length > this.maxEvents) {
            this.unfilteredEvents.pop();
        }

        this.logEntryEvents = this.unfilteredEvents.filter(
            logEntryEvent =>
                this._meetsLoggedByFilter(logEntryEvent) &&
                this._meetsLoggingLevelFilter(logEntryEvent) &&
                this._meetsMessageFilter(logEntryEvent) &&
                this._meetsOriginLocationFilter(logEntryEvent) &&
                this._meetsOriginTypeFilter(logEntryEvent) &&
                this._meetsScenarioFilter(logEntryEvent)
        );
    }

    _meetsLoggedByFilter(logEntryEvent) {
        return this._matchesTextFilter(this.loggedByFilter, logEntryEvent.LoggedByUsername__c);
    }

    _meetsLoggingLevelFilter(logEntryEvent) {
        let matches = false;
        if (!this.loggingLevelFilter || Number(logEntryEvent.LoggingLevelOrdinal__c) >= Number(this.loggingLevelFilter)) {
            matches = true;
        }
        return matches;
    }

    _meetsMessageFilter(logEntryEvent) {
        return this._matchesTextFilter(this.messageFilter, logEntryEvent.Message__c);
    }

    _meetsOriginLocationFilter(logEntryEvent) {
        return this._matchesTextFilter(this.originLocationFilter, logEntryEvent.OriginLocation__c);
    }

    _meetsOriginTypeFilter(logEntryEvent) {
        return this._matchesTextFilter(this.originTypeFilter, logEntryEvent.OriginType__c);
    }

    _meetsScenarioFilter(logEntryEvent) {
        return this._matchesTextFilter(this.scenarioFilter, logEntryEvent.Scenario__c);
    }

    _matchesTextFilter(filterCriteria = '', text = '') {
        let matches = false;
        if (!filterCriteria || text.includes(filterCriteria) || text.match(filterCriteria)) {
            matches = true;
        }
        return matches;
    }
}