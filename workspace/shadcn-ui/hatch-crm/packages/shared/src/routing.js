"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeLead = exports.scoreAgent = exports.routingConfigSchema = exports.evaluateLeadRoutingConditions = exports.leadRoutingRuleConfigSchema = exports.leadRoutingFallbackSchema = exports.leadRoutingTargetSchema = exports.leadRoutingAgentFilterSchema = exports.leadRoutingConditionsSchema = exports.leadRoutingCustomFieldConditionSchema = exports.leadRoutingCustomFieldOperatorSchema = exports.leadRoutingDemographicsSchema = exports.leadRoutingConsentConditionSchema = exports.leadRoutingSourceSchema = exports.leadRoutingPriceBandSchema = exports.leadRoutingGeographySchema = exports.leadRoutingTimeWindowSchema = exports.leadRoutingDaysOfWeekSchema = exports.leadRoutingBuyerRepRequirementSchema = exports.leadRoutingConsentRequirementSchema = exports.leadRoutingConsentStateSchema = exports.routingStringSetFilterSchema = exports.routingMatchModeSchema = exports.leadRoutingModeSchema = void 0;
const zod_1 = require("zod");
exports.leadRoutingModeSchema = zod_1.z.enum(['FIRST_MATCH', 'SCORE_AND_ASSIGN']);
exports.routingMatchModeSchema = zod_1.z.enum(['ANY', 'ALL']);
exports.routingStringSetFilterSchema = zod_1.z.object({
    include: zod_1.z.array(zod_1.z.string()).optional(),
    exclude: zod_1.z.array(zod_1.z.string()).optional(),
    match: exports.routingMatchModeSchema.optional()
});
exports.leadRoutingConsentStateSchema = zod_1.z.enum(['GRANTED', 'REVOKED', 'UNKNOWN']);
exports.leadRoutingConsentRequirementSchema = zod_1.z.enum(['OPTIONAL', 'GRANTED', 'NOT_REVOKED']);
exports.leadRoutingBuyerRepRequirementSchema = zod_1.z.enum(['ANY', 'REQUIRED_ACTIVE', 'PROHIBIT_ACTIVE']);
const timeExpression = /^\d{2}:\d{2}$/;
exports.leadRoutingDaysOfWeekSchema = zod_1.z.array(zod_1.z.number().int().min(0).max(6)).min(1);
exports.leadRoutingTimeWindowSchema = zod_1.z.object({
    timezone: zod_1.z.string(),
    start: zod_1.z
        .string()
        .regex(timeExpression, 'start must be formatted HH:MM'),
    end: zod_1.z
        .string()
        .regex(timeExpression, 'end must be formatted HH:MM'),
    days: exports.leadRoutingDaysOfWeekSchema.optional()
});
exports.leadRoutingGeographySchema = zod_1.z
    .object({
    includeStates: zod_1.z.array(zod_1.z.string()).optional(),
    includeCities: zod_1.z.array(zod_1.z.string()).optional(),
    includePostalCodes: zod_1.z.array(zod_1.z.string()).optional(),
    excludeStates: zod_1.z.array(zod_1.z.string()).optional(),
    excludeCities: zod_1.z.array(zod_1.z.string()).optional(),
    excludePostalCodes: zod_1.z.array(zod_1.z.string()).optional()
})
    .optional();
exports.leadRoutingPriceBandSchema = zod_1.z
    .object({
    min: zod_1.z.number().nonnegative().optional(),
    max: zod_1.z.number().positive().optional(),
    currency: zod_1.z.string().optional()
})
    .optional();
exports.leadRoutingSourceSchema = zod_1.z
    .object({
    include: zod_1.z.array(zod_1.z.string()).optional(),
    exclude: zod_1.z.array(zod_1.z.string()).optional()
})
    .optional();
exports.leadRoutingConsentConditionSchema = zod_1.z
    .object({
    sms: exports.leadRoutingConsentRequirementSchema.optional(),
    email: exports.leadRoutingConsentRequirementSchema.optional()
})
    .optional();
exports.leadRoutingDemographicsSchema = zod_1.z
    .object({
    minAge: zod_1.z.number().int().min(0).optional(),
    maxAge: zod_1.z.number().int().min(0).optional(),
    tags: exports.routingStringSetFilterSchema.optional(),
    languages: exports.routingStringSetFilterSchema.optional(),
    ethnicities: exports.routingStringSetFilterSchema.optional()
})
    .optional();
exports.leadRoutingCustomFieldOperatorSchema = zod_1.z.enum([
    'EQUALS',
    'NOT_EQUALS',
    'IN',
    'NOT_IN',
    'GT',
    'GTE',
    'LT',
    'LTE',
    'CONTAINS',
    'NOT_CONTAINS',
    'EXISTS',
    'NOT_EXISTS'
]);
exports.leadRoutingCustomFieldConditionSchema = zod_1.z.object({
    key: zod_1.z.string().min(1),
    operator: exports.leadRoutingCustomFieldOperatorSchema,
    value: zod_1.z.any().optional()
});
exports.leadRoutingConditionsSchema = zod_1.z.object({
    geography: exports.leadRoutingGeographySchema,
    priceBand: exports.leadRoutingPriceBandSchema,
    sources: exports.leadRoutingSourceSchema,
    consent: exports.leadRoutingConsentConditionSchema,
    buyerRep: exports.leadRoutingBuyerRepRequirementSchema.optional(),
    timeWindows: zod_1.z.array(exports.leadRoutingTimeWindowSchema).optional(),
    demographics: exports.leadRoutingDemographicsSchema,
    customFields: zod_1.z.array(exports.leadRoutingCustomFieldConditionSchema).optional()
});
exports.leadRoutingAgentFilterSchema = zod_1.z.object({
    tags: exports.routingStringSetFilterSchema.optional(),
    languages: exports.routingStringSetFilterSchema.optional(),
    specialties: exports.routingStringSetFilterSchema.optional(),
    minKeptApptRate: zod_1.z.number().min(0).max(1).optional(),
    minCapacityRemaining: zod_1.z.number().int().min(0).optional()
});
exports.leadRoutingTargetSchema = zod_1.z.discriminatedUnion('type', [
    zod_1.z.object({
        type: zod_1.z.literal('AGENT'),
        id: zod_1.z.string(),
        label: zod_1.z.string().optional(),
        agentFilter: exports.leadRoutingAgentFilterSchema.optional()
    }),
    zod_1.z.object({
        type: zod_1.z.literal('TEAM'),
        id: zod_1.z.string(),
        strategy: zod_1.z.enum(['BEST_FIT', 'ROUND_ROBIN']).default('BEST_FIT'),
        includeRoles: zod_1.z.array(zod_1.z.string()).optional(),
        agentFilter: exports.leadRoutingAgentFilterSchema.optional()
    }),
    zod_1.z.object({
        type: zod_1.z.literal('POND'),
        id: zod_1.z.string(),
        label: zod_1.z.string().optional()
    })
]);
exports.leadRoutingFallbackSchema = zod_1.z
    .object({
    teamId: zod_1.z.string(),
    label: zod_1.z.string().optional(),
    escalationChannels: zod_1.z.array(zod_1.z.enum(['EMAIL', 'SMS', 'IN_APP'])).optional(),
    relaxAgentFilters: zod_1.z.boolean().optional()
})
    .optional();
exports.leadRoutingRuleConfigSchema = zod_1.z.object({
    conditions: exports.leadRoutingConditionsSchema.default({}),
    targets: zod_1.z.array(exports.leadRoutingTargetSchema).min(1),
    fallback: exports.leadRoutingFallbackSchema
});
const parseTimeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10));
    return hours * 60 + minutes;
};
const resolveTimeParts = (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
        timeZone
    });
    const parts = formatter.formatToParts(date);
    const hour = Number.parseInt(parts.find((part) => part.type === 'hour')?.value ?? '0', 10);
    const minute = Number.parseInt(parts.find((part) => part.type === 'minute')?.value ?? '0', 10);
    const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Sun';
    const abbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const index = abbreviations.findIndex((value) => weekday.startsWith(value));
    return { minutes: hour * 60 + minute, dayIndex: index === -1 ? 0 : index };
};
const matchGeography = (condition, listing) => {
    if (!listing) {
        return {
            passed: false,
            detail: 'No listing context available for geography matching'
        };
    }
    const city = listing.city?.toLowerCase();
    const state = listing.state?.toLowerCase();
    const postalCode = listing.postalCode?.toLowerCase();
    const includesState = condition.includeStates?.map((value) => value.toLowerCase());
    const excludesState = condition.excludeStates?.map((value) => value.toLowerCase());
    if (includesState && includesState.length > 0 && (!state || !includesState.includes(state))) {
        return {
            passed: false,
            detail: `State ${state ?? 'unknown'} not in allowed list`
        };
    }
    if (excludesState && state && excludesState.includes(state)) {
        return {
            passed: false,
            detail: `State ${state} explicitly excluded`
        };
    }
    const includesCity = condition.includeCities?.map((value) => value.toLowerCase());
    const excludesCity = condition.excludeCities?.map((value) => value.toLowerCase());
    if (includesCity && includesCity.length > 0 && (!city || !includesCity.includes(city))) {
        return {
            passed: false,
            detail: `City ${city ?? 'unknown'} not in allowed list`
        };
    }
    if (excludesCity && city && excludesCity.includes(city)) {
        return {
            passed: false,
            detail: `City ${city} explicitly excluded`
        };
    }
    const includesPostal = condition.includePostalCodes?.map((value) => value.toLowerCase());
    const excludesPostal = condition.excludePostalCodes?.map((value) => value.toLowerCase());
    if (includesPostal && includesPostal.length > 0 && (!postalCode || !includesPostal.includes(postalCode))) {
        return {
            passed: false,
            detail: `Postal code ${postalCode ?? 'unknown'} not in allowed list`
        };
    }
    if (excludesPostal && postalCode && excludesPostal.includes(postalCode)) {
        return {
            passed: false,
            detail: `Postal code ${postalCode} explicitly excluded`
        };
    }
    return { passed: true, detail: undefined };
};
const matchPriceBand = (condition, listing) => {
    const price = listing?.price ?? null;
    if (price === null || price === undefined) {
        return {
            passed: false,
            detail: 'Listing price unavailable'
        };
    }
    if (condition.min !== undefined && price < condition.min) {
        return {
            passed: false,
            detail: `Listing price ${price} below minimum ${condition.min}`
        };
    }
    if (condition.max !== undefined && price > condition.max) {
        return {
            passed: false,
            detail: `Listing price ${price} above maximum ${condition.max}`
        };
    }
    return { passed: true, detail: undefined };
};
const matchSource = (condition, person) => {
    const source = person.source?.toLowerCase() ?? null;
    const includes = condition.include?.map((value) => value.toLowerCase());
    const excludes = condition.exclude?.map((value) => value.toLowerCase());
    if (includes && includes.length > 0 && (!source || !includes.includes(source))) {
        return {
            passed: false,
            detail: `Source ${source ?? 'unknown'} not in allowed list`
        };
    }
    if (excludes && source && excludes.includes(source)) {
        return {
            passed: false,
            detail: `Source ${source} explicitly excluded`
        };
    }
    return { passed: true, detail: undefined };
};
const matchConsentRequirement = (requirement, state, channel) => {
    if (!requirement || requirement === 'OPTIONAL') {
        return { passed: true, detail: undefined };
    }
    if (requirement === 'GRANTED' && state !== 'GRANTED') {
        return {
            passed: false,
            detail: `${channel.toUpperCase()} consent must be granted`
        };
    }
    if (requirement === 'NOT_REVOKED' && state === 'REVOKED') {
        return {
            passed: false,
            detail: `${channel.toUpperCase()} consent revoked`
        };
    }
    return { passed: true, detail: undefined };
};
const matchBuyerRep = (requirement, status) => {
    if (!requirement || requirement === 'ANY') {
        return { passed: true, detail: undefined };
    }
    const normalized = status?.toUpperCase() ?? 'UNKNOWN';
    if (requirement === 'REQUIRED_ACTIVE' && normalized !== 'ACTIVE') {
        return {
            passed: false,
            detail: `Active buyer representation required`
        };
    }
    if (requirement === 'PROHIBIT_ACTIVE' && normalized === 'ACTIVE') {
        return {
            passed: false,
            detail: `Leads with active buyer representation excluded`
        };
    }
    return { passed: true, detail: undefined };
};
const matchTimeWindows = (windows, context) => {
    const details = windows.map((window) => {
        const days = window.days
            ? window.days.map((day) => ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][day]).join(', ')
            : 'All days';
        return `${window.start}-${window.end} ${window.timezone} (${days})`;
    });
    const matched = windows.some((window) => {
        const now = resolveTimeParts(context.now, window.timezone);
        if (window.days && window.days.length > 0 && !window.days.includes(now.dayIndex)) {
            return false;
        }
        const startMinutes = parseTimeToMinutes(window.start);
        const endMinutes = parseTimeToMinutes(window.end);
        if (startMinutes <= endMinutes) {
            return now.minutes >= startMinutes && now.minutes <= endMinutes;
        }
        // Overnight window (e.g. 22:00 - 06:00)
        return now.minutes >= startMinutes || now.minutes <= endMinutes;
    });
    return {
        passed: matched,
        detail: matched ? undefined : `Outside allowed windows: ${details.join('; ')}`
    };
};
const normalizeStringSet = (values) => (values ?? [])
    .map((value) => value?.trim())
    .filter(Boolean)
    .map((value) => value.toLowerCase());
const matchStringSetFilter = (label, filter, haystack) => {
    const includes = normalizeStringSet(filter.include);
    const excludes = normalizeStringSet(filter.exclude);
    const mode = filter.match ?? 'ANY';
    if (excludes.length > 0) {
        const blocked = excludes.find((value) => haystack.includes(value));
        if (blocked) {
            return { passed: false, detail: `${label} ${blocked} explicitly excluded` };
        }
    }
    if (includes.length > 0) {
        const matched = mode === 'ALL'
            ? includes.every((value) => haystack.includes(value))
            : includes.some((value) => haystack.includes(value));
        if (!matched) {
            return { passed: false, detail: `${label} missing required values (${mode})` };
        }
    }
    return { passed: true, detail: undefined };
};
const matchDemographics = (condition, person) => {
    const tags = normalizeStringSet(person.tags);
    const languages = [...normalizeStringSet(person.languages), ...tags];
    const ethnicities = [...normalizeStringSet(person.ethnicities), ...tags];
    if (condition.minAge !== undefined || condition.maxAge !== undefined) {
        const age = person.age ?? null;
        if (age === null) {
            return { passed: false, detail: 'Age unavailable' };
        }
        if (condition.minAge !== undefined && age < condition.minAge) {
            return { passed: false, detail: `Age ${age} below minimum ${condition.minAge}` };
        }
        if (condition.maxAge !== undefined && age > condition.maxAge) {
            return { passed: false, detail: `Age ${age} above maximum ${condition.maxAge}` };
        }
    }
    if (condition.tags) {
        const result = matchStringSetFilter('Tag', condition.tags, tags);
        if (!result.passed)
            return result;
    }
    if (condition.languages) {
        const result = matchStringSetFilter('Language', condition.languages, languages);
        if (!result.passed)
            return result;
    }
    if (condition.ethnicities) {
        const result = matchStringSetFilter('Ethnicity', condition.ethnicities, ethnicities);
        if (!result.passed)
            return result;
    }
    return { passed: true, detail: undefined };
};
const isNil = (value) => value === null || value === undefined;
const equalsValue = (left, right) => {
    if (typeof left === 'number' && typeof right === 'number')
        return left === right;
    if (typeof left === 'string' && typeof right === 'string')
        return left.toLowerCase() === right.toLowerCase();
    if (typeof left === 'boolean' && typeof right === 'boolean')
        return left === right;
    return JSON.stringify(left) === JSON.stringify(right);
};
const toNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};
const toArray = (value) => (Array.isArray(value) ? value : value === undefined ? [] : [value]);
const matchCustomFieldCondition = (condition, fields) => {
    const value = fields[condition.key];
    const operator = condition.operator;
    const expected = condition.value;
    if (operator === 'EXISTS') {
        return { passed: !isNil(value), detail: !isNil(value) ? undefined : `Custom field ${condition.key} missing` };
    }
    if (operator === 'NOT_EXISTS') {
        return { passed: isNil(value), detail: isNil(value) ? undefined : `Custom field ${condition.key} present` };
    }
    if (isNil(value)) {
        return { passed: false, detail: `Custom field ${condition.key} missing` };
    }
    if (operator === 'EQUALS') {
        const passed = equalsValue(value, expected);
        return { passed, detail: passed ? undefined : `Custom field ${condition.key} does not equal expected value` };
    }
    if (operator === 'NOT_EQUALS') {
        const passed = !equalsValue(value, expected);
        return { passed, detail: passed ? undefined : `Custom field ${condition.key} equals excluded value` };
    }
    if (operator === 'IN' || operator === 'NOT_IN') {
        const expectedValues = toArray(expected);
        const valueValues = toArray(value);
        const matched = valueValues.some((candidate) => expectedValues.some((entry) => equalsValue(candidate, entry)));
        const passed = operator === 'IN' ? matched : !matched;
        return {
            passed,
            detail: passed ? undefined : `Custom field ${condition.key} ${operator === 'IN' ? 'not in' : 'in'} expected set`
        };
    }
    if (operator === 'CONTAINS' || operator === 'NOT_CONTAINS') {
        let matched = false;
        if (typeof value === 'string' && typeof expected === 'string') {
            matched = value.toLowerCase().includes(expected.toLowerCase());
        }
        else if (Array.isArray(value)) {
            matched = value.some((entry) => equalsValue(entry, expected));
        }
        const passed = operator === 'CONTAINS' ? matched : !matched;
        return {
            passed,
            detail: passed ? undefined : `Custom field ${condition.key} ${operator === 'CONTAINS' ? 'missing' : 'contains'} expected value`
        };
    }
    const valueNumber = toNumber(value);
    const expectedNumber = toNumber(expected);
    if (valueNumber === null || expectedNumber === null) {
        return { passed: false, detail: `Custom field ${condition.key} not comparable` };
    }
    const passed = operator === 'GT'
        ? valueNumber > expectedNumber
        : operator === 'GTE'
            ? valueNumber >= expectedNumber
            : operator === 'LT'
                ? valueNumber < expectedNumber
                : operator === 'LTE'
                    ? valueNumber <= expectedNumber
                    : false;
    return {
        passed,
        detail: passed ? undefined : `Custom field ${condition.key} comparison failed`
    };
};
const evaluateLeadRoutingConditions = (conditions, context) => {
    if (!conditions) {
        return { matched: true, checks: [] };
    }
    const parsed = exports.leadRoutingConditionsSchema.parse(conditions);
    const checks = [];
    if (parsed.geography) {
        const result = matchGeography(parsed.geography, context.listing);
        checks.push({ key: 'geography', passed: result.passed, detail: result.detail });
    }
    if (parsed.priceBand) {
        const result = matchPriceBand(parsed.priceBand, context.listing);
        checks.push({ key: 'priceBand', passed: result.passed, detail: result.detail });
    }
    if (parsed.sources) {
        const result = matchSource(parsed.sources, context.person);
        checks.push({ key: 'sources', passed: result.passed, detail: result.detail });
    }
    if (parsed.consent) {
        const sms = matchConsentRequirement(parsed.consent.sms, context.person.consent.sms, 'sms');
        const email = matchConsentRequirement(parsed.consent.email, context.person.consent.email, 'email');
        const passed = sms.passed && email.passed;
        const details = [sms.detail, email.detail].filter(Boolean).join('; ') || undefined;
        checks.push({ key: 'consent', passed, detail: details });
    }
    if (parsed.buyerRep) {
        const result = matchBuyerRep(parsed.buyerRep, context.person.buyerRepStatus);
        checks.push({ key: 'buyerRep', passed: result.passed, detail: result.detail });
    }
    if (parsed.timeWindows && parsed.timeWindows.length > 0) {
        const result = matchTimeWindows(parsed.timeWindows, context);
        checks.push({ key: 'timeWindows', passed: result.passed, detail: result.detail });
    }
    if (parsed.demographics) {
        const result = matchDemographics(parsed.demographics, context.person);
        checks.push({ key: 'demographics', passed: result.passed, detail: result.detail });
    }
    if (parsed.customFields && parsed.customFields.length > 0) {
        const fields = (context.person.customFields ?? {});
        const failures = parsed.customFields
            .map((condition) => matchCustomFieldCondition(condition, fields))
            .filter((result) => !result.passed);
        checks.push({
            key: 'customFields',
            passed: failures.length === 0,
            detail: failures[0]?.detail
        });
    }
    const matched = checks.every((check) => check.passed);
    return { matched, checks };
};
exports.evaluateLeadRoutingConditions = evaluateLeadRoutingConditions;
exports.routingConfigSchema = zod_1.z.object({
    minimumScore: zod_1.z.number().default(0.6),
    performanceWeight: zod_1.z.number().default(0.25),
    capacityWeight: zod_1.z.number().default(0.35),
    geographyWeight: zod_1.z.number().default(0.2),
    priceBandWeight: zod_1.z.number().default(0.2)
});
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const capacityScore = (capacityTarget, activePipeline) => {
    if (capacityTarget <= 0)
        return 0;
    const remaining = Math.max(capacityTarget - activePipeline, 0);
    return clamp01(remaining / capacityTarget);
};
const scoreAgent = (input, config) => {
    if (!input.consentReady || !input.tenDlcReady) {
        return null;
    }
    const capacity = capacityScore(input.capacityTarget, input.activePipeline);
    const performance = clamp01(input.keptApptRate);
    const geography = clamp01(input.geographyFit);
    const priceBand = clamp01(input.priceBandFit);
    const score = capacity * config.capacityWeight +
        performance * config.performanceWeight +
        geography * config.geographyWeight +
        priceBand * config.priceBandWeight;
    const reasons = [
        {
            type: 'CAPACITY',
            description: `Capacity remaining ${(capacity * 100).toFixed(0)}%`,
            weight: config.capacityWeight
        },
        {
            type: 'PERFORMANCE',
            description: `Kept appointment rate ${(performance * 100).toFixed(0)}%`,
            weight: config.performanceWeight
        },
        {
            type: 'GEOGRAPHY',
            description: `Geography fit ${(geography * 100).toFixed(0)}%`,
            weight: config.geographyWeight
        },
        {
            type: 'PRICE_BAND',
            description: `Price-band fit ${(priceBand * 100).toFixed(0)}%`,
            weight: config.priceBandWeight
        }
    ];
    return {
        userId: input.userId,
        fullName: input.fullName,
        score: Number(score.toFixed(4)),
        reasons
    };
};
exports.scoreAgent = scoreAgent;
const routeLead = (payload) => {
    const config = exports.routingConfigSchema.parse(payload.config ?? {});
    const scored = payload.agents
        .map((agent) => (0, exports.scoreAgent)(agent, config))
        .filter((value) => value !== null)
        .sort((a, b) => b.score - a.score);
    const bestScore = scored[0]?.score ?? 0;
    const selected = scored.filter((agent) => agent.score >= config.minimumScore && agent.score >= bestScore - 0.05);
    const usedFallback = selected.length === 0;
    const chosen = usedFallback
        ? scored.slice(0, 1)
        : selected.sort((a, b) => (a.score === b.score ? 0 : b.score - a.score));
    return {
        leadId: payload.leadId,
        tenantId: payload.tenantId,
        selectedAgents: chosen,
        fallbackTeamId: usedFallback ? payload.fallbackTeamId : undefined,
        usedFallback,
        quietHours: payload.quietHours
    };
};
exports.routeLead = routeLead;
//# sourceMappingURL=routing.js.map