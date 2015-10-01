var React = require('react');
var $ = require('jquery');
var moment = require('moment');
var _ = require('lodash');
var Router = require('react-router');
var TableRow = require('./tablerow.jsx');
var TableHeader = require('./tableheader.jsx')
var classString = require('react-classset');

module.exports = DeployLog = React.createClass({

    mixins: [Router.State],

    getInitialState: function () {
        return {
            items: [],
            loaded: false,
            itemRenderCount: 50,
            filters: this.enrichFromObject(this.emptyFilters, this.getQuery())
        };
    },

    componentDidMount: function () {
        this.getServersFromBackend();
    },

    render: function () {

        filteredEvents = this.applyHeaderFilter(this.state.items, this.state.filters.regexp).filter(this.inactiveVersionsIfEnabled);
        eventsToRender = filteredEvents.slice(0, this.state.itemRenderCount);

        return (
            <div className="container">
                <h2>servers
                    <small>{eventsToRender.length + "/" + this.state.items.length}</small>
                    <div className="pull-right btn-toolbar" data-toggle="buttons" role="group">
                        <button type="button"  className="btn btn-default btn-sm" onClick={this.clearFilters} >
                            <i className="fa fa-trash"></i>
                        &nbsp;
                        tøm filtere</button>
                        <label className={this.regexpToggleButtonClasses()} title="Matcher strengene eksakt. F.eks 't1' matcher kun 't1', ikke 't10', 't11' osv. Støtter også regulære uttrykk.">
                            <input type="checkbox" autoComplete="off" onClick={this.toggleRegexpMode} />
                        eksakt match
                        </label>
                    </div>
                </h2>

                <table className='table table-bordered table-striped'>
                    <tr>
                        <TableHeader columnName="hostname" regexp={this.state.filters.regexp} value={this.state.filters.hostname} changeHandler={this.handleChange} />
                        <TableHeader columnName="application" regexp={this.state.filters.regexp} value={this.state.filters.application} changeHandler={this.handleChange} />
                        <TableHeader columnName="environment" regexp={this.state.filters.regexp} value={this.state.filters.environment} changeHandler={this.handleChange} />
                        <TableHeader columnName="type" regexp={this.state.filters.regexp} value={this.state.filters.type} changeHandler={this.handleChange} />
                    </tr>
                    <tbody>
                        {eventsToRender.map(function (elem) {
                            return <TableRow key={elem.hostname} server={elem} />
                        })}
                    </tbody>
                </table>
                <button type="button" className="btn btn-link" onClick={this.viewMoreResults}>View more results...</button>
            </div>
        )
    },

    validBackendParams: ["application", "environment", "type", "hostname"],

    DEPLOYLOG_SERVICE: '/api/v1/servers',

    emptyFilters: {
        hostname: '',
        application: '',
        environment: '',
        type: '',
        regexp: false
    },

    applyHeaderFilter: function (items, regexpMode) {
        if (regexpMode) {
            return this.filterWithPreCompiledRegexp(items);
        } else {
            return items.filter(this.stringContainedIn);
        }
    },

    filterWithPreCompiledRegexp: function (items) {
        var compileValidRegEx = function(filterValue){
            var isValidRegex = function (expression) {
                try {
                    new RegExp("^" + expression + "$");
                    return true;
                } catch (e) {
                    return false;
                }
            }

            if (isValidRegex(filterValue)){
                return new RegExp("^" + (filterValue ? filterValue : ".*") + "$", "i");
            } else {
                return new RegExp("^$");
            }
        }

        var preCompiledRegexp = {
            "hostname": compileValidRegEx(this.state.filters["hostname"]),
            "application": compileValidRegEx(this.state.filters["application"]),
            "environment": compileValidRegEx(this.state.filters["environment"]),
            "type": compileValidRegEx(this.state.filters["type"])
        }

        return items.filter(function (item) {
            return preCompiledRegexp["hostname"].test(item.hostname) &&
                preCompiledRegexp["application"].test(item.application) &&
                preCompiledRegexp["environment"].test(item.environment) &&
                preCompiledRegexp["type"].test(item.type)
        }.bind(this));
    },

    stringContainedIn: function (elem) {
        return elem.hostname.toLowerCase().indexOf(this.state.filters.hostname.toLowerCase()) > -1
            && elem.application.toLowerCase().indexOf(this.state.filters.application.toLowerCase()) > -1
            && elem.environment.toLowerCase().indexOf(this.state.filters.environment.toLowerCase()) > -1
            && elem.type.toLowerCase().indexOf(this.state.filters.type.toLowerCase()) > -1
    },

    inactiveVersionsIfEnabled: function (elem) {
        if (!this.state.filters.onlyLatest) {
            return true;
        } else {
            return elem.replaced_timestamp === null;
        }
    },

    handleChange: function (e) {
        var filter = _.clone(this.state.filters, true);
        filter[e.target.id] = e.target.value;
        this.setState({filters: filter});
    },

    getInitialBackendParams: function () {
        var serialize = function (obj) {
            return '?' + Object.keys(obj).reduce(function (a, k) {
                    a.push(k + '=' + encodeURIComponent(obj[k]));
                    return a;
                }, []).join('&')
        };

        var extractFromObject = function (values, object) {
            return Object.keys(object).filter(function (val) {
                return values.indexOf(val) > -1;
            });
        };

        var urlContainsValidBackendParams = extractFromObject(this.validBackendParams, this.getQuery()).length > 0;
        if (urlContainsValidBackendParams) {
            var extractedValidParams = _.pick(this.getQuery(), this.validBackendParams);
            return serialize(extractedValidParams);
        } else {
            return '?last=1week';
        }
    },

    getServersFromBackend: function () {
        return $.getJSON('/api/v1/servers').success(function (data) {
            this.setState({items: data.map(function(server){
                if (!server.application){
                    server.application = 'n/a'
                }

                if (!server.environment){
                    server.environment = 'n/a'
                }

                if (!server.type){
                    server.type = 'n/a'
                }

                return server;
            })})
        }.bind(this));
    },

    enrichFromObject: function (base, object) {
        var enrichedObject = {};
        Object.keys(base).forEach(function (key) {
            enrichedObject[key] = object[key] ? object[key] : '';
        });

        return enrichedObject;
    },

    viewMoreResults: function () {
        this.setState({itemRenderCount: this.state.itemRenderCount + 50})
    },

    clearFilters: function () {
        this.setState({filters: _.clone(this.emptyFilters)});
    },

    toggleRegexpMode: function () {
        var filter = _.clone(this.state.filters, true);
        filter['regexp'] = !this.state.filters.regexp;
        this.setState({filters: filter});
    },

    regexpToggleButtonClasses: function () {
        return classString({
            "btn": true,
            "btn-default": true,
            "btn-sm": true,
            "active": this.state.filters.regexp
        })
    }
});