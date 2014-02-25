
function powerfocus(domain, range, interpolate, focus, exponent, scaleInterpolate) {
	var rangeSize, domainSize;

	function output(pos) {
		pos -= domain[0];
		var focus2 = focus - domain[0];
		if (pos < 0) {
			return range[0];
		}
		if (pos <= focus2 && focus2 > 0) {
			pos = range[0] + focus2 * rangeSize / domainSize * Math.pow(pos/focus2, exponent);
			if (pos < 1.0e-9) {
				pos = 0;
			}
			return pos;
		}
		if (pos < domainSize) {
			return range[0] + rangeSize * (1 - (1-(focus2/domainSize))*Math.pow((domainSize-pos)/(domainSize-focus2),exponent));
		}
		return rangeSize;
	}

	function input(pos) {
		pos -= range[0];
		var focus2 = Math.min(focus - domain[0], domainSize);
		if (pos <= 0) {
			return domain[0];
		}
		if (pos < rangeSize) {
			if ((pos/rangeSize) < (focus2/domainSize)) {
				return domain[0] + Math.round(focus2*Math.pow((pos/rangeSize)/(focus2/domainSize), 1/exponent));
			}
			if (focus2 < domainSize) {
				return domain[0] + Math.round(domainSize-(domainSize-focus2)*Math.pow((1-(pos/rangeSize))/(1-(focus2/domainSize)), 1/exponent));
			}
		}
		return domain[1];
	}

	function derivative(pos) {
		if (pos < focus) {
			return rangeSize / domainSize * exponent * Math.pow((pos-domain[0])/focus, exponent - 1);
		} else if (focus < domain[1]) {
			return rangeSize / domainSize * exponent * Math.pow((domain[1]-pos)/(domain[1]-focus), exponent - 1);
		} else {
			return 1000.0;
		}
	}

	function invDerivAtFocus() {
		return domainSize / (rangeSize * exponent);
	}


	function rescale() {
		rangeSize = range[1] - range[0];
		domainSize = domain[1] - domain[0];
		return scale;
	}

	function scale(x) {
		return output(x);
	}

	// Note: requires range is coercible to number!
	scale.invert = function(y) {
		return input(y);
	};

	scale.domain = function(x) {
		if (!arguments.length) return domain;
		domain = x.map(Number);
		focus = Math.min(Math.max(focus, domain[0]), domain[1]);
		return rescale();
	};

	scale.range = function(x) {
		if (!arguments.length) return range;
		range = x;
		return rescale();
	};

	scale.rangeRound = function(x) {
		return scale.range(x).interpolate(d3.interpolateRound);
	};

	scale.focus = function(x) {
		if (!arguments.length) return focus;
		focus = Math.min(Math.max(x, domain[0]), domain[1]);
		return rescale();
	};

	scale.exponent = function(x) {
		if (!arguments.length) return exponent;
		exponent = x;
		return rescale();
	};

	scale.interpolate = function(x) {
		if (!arguments.length) return interpolate;
		interpolate = x;
		return rescale();
	};

	scale.scaleInterpolate = function(x) {
		if (!arguments.length) return scaleInterpolate;
		scaleInterpolate = x;
		return rescale();
	};

	scale.ticks = function(m) {
		var ticks = [domain[0]];
		var power = Math.floor(Math.log(domain[1])/Math.log(10));
		function addTicks(start, end, interval) {
			start = Math.floor(start/interval)*interval;
			end = Math.ceil(end/interval)*interval;
			var sstart = output(start);
			var sprev = sstart;
			for (var i = start+interval;i<=end;i+=interval) {
				var scur = output(i);
				if (scur - sprev > 60) {
					addTicks(Math.max(start, i-interval), Math.min(end, i), interval/10);
				}
				if (i < end) {
					ticks.push(i);
					sprev = scur;
				}
			}
		}
		addTicks(domain[0], domain[1], Math.pow(10, power));
		ticks.push(domain[1]);
		return ticks;
	};

	scale.powerticks = function(m) {
		var power = Math.floor(Math.log(domain[1])/Math.log(10));
		var ticks = [[domain[0], power+1]];
		function addTicks(start, end, power) {
			var interval = Math.pow(10, power);
			start = Math.floor(start/interval)*interval;
			var end2 = Math.ceil(end/interval)*interval;
			var sstart = output(start);
			var sprev = sstart;
			for (var i = start+interval;i<=end2;i+=interval) {
				var iclamp = Math.min(end, i);
				var scur = output(iclamp);
				if (scur - sprev > 50) {
					addTicks(Math.max(start, i-interval), iclamp, power-1);
				}
				if (i < end) {
					ticks.push([i, power+1]);
					sprev = scur;
				}
			}
		}
		addTicks(domain[0], domain[1], power);
		ticks.push([domain[1], power]);
		return ticks;
	};

	scale.tickFormat = function(m) {
		return d3_scale_polypowTickFormat(domain, m);
	};

	scale.nice = function() {
		d3_scale_nice(domain, d3_scale_polypowNice);
		return rescale();
	};

	scale.copy = function() {
		return powerfocus(domain, range, interpolate, focus, exponent);
	};

	scale.regionFocus = function(rstart, rend, proportion) {
		var rlen = rend - rstart;
		var dlen = domain[1] - domain[0];
		focus = dlen * rstart / (dlen - rlen);
		exponent =  Math.log(1 - proportion) / Math.log((dlen - rlen) / dlen);
	};

	scale.derivative = function(pos) {
		return derivative(pos);
	};

	scale.invDerivAtFocus = function() {
		return invDerivAtFocus();
	};

	if (scaleInterpolate === undefined) {
		scaleInterpolate = function(oldScale) {
			var scale = oldScale.copy();
			var exponent1 = oldScale.exponent();
			var exponent2 = exponent - exponent1;
			var focus1 = oldScale.focus();
			var focus2 = focus - focus1;
			// assume same domain/range for now...
			return function(t) {
				scale.exponent(exponent1 + t*exponent2);
				scale.focus(focus1+t*focus2);
				return scale;
			};
		};
	}

return rescale();
}

function d3_scale_polypowRebind(scale, polypow) {
	return d3.rebind(scale, polypow, "range", "rangeRound", "interpolate", "focus", "exponent");
}

function d3_scale_polypowNice(dx) {
	dx = Math.pow(10, Math.round(Math.log(dx) / Math.LN10) - 1);
	return dx && {
		floor: function(x) { return Math.floor(x / dx) * dx; },
		ceil: function(x) { return Math.ceil(x / dx) * dx; }
	};
}


function d3_scale_polypowTickFormat(domain, m) {
	return d3.format(",." + Math.max(0, -Math.floor(Math.log(d3_scale_polypowTickRange(domain, m)[2]) / Math.LN10 + 0.01)) + "f");
}
