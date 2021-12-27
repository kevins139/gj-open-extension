/**
 * Assumptions
 * - Briers are calculated for days where the forecast was present at MIDNIGHT, e.g. if a forecast is made at
 * 23:59 on 1st December, then superseded at 00:01 on 2nd December, and the question closes at 08:00 on 4rd December
 * the final brier score will be calculated as one part forecast 1 and 2 parts forecast 2.
 *
 */
const oneDay = 24 * 60 * 60 * 1000;
const average = (array) => array.reduce((a, b) => a + b) / array.length;

var myInterval = setInterval(function(){
    if (!document.getElementById("question_my_forecasts")) {
        clearInterval(myInterval);
    }
    if ([...document.getElementById("question_my_forecasts").getElementsByClassName("prediction-set")].length != 0) {
        const closingDate = new Date(document.getElementsByClassName("question-openclose")[0].querySelectorAll('[data-localizable-timestamp]')[1].getAttribute("data-localizable-timestamp"));
        // Only bother if the predicted scores aren't already there for now. TODO make this work for live updates to the
        // slider
        if (document.getElementById("brier-nowcast") || !document.getElementsByClassName("answer-name")[0] || document.getElementsByClassName("answer-name")[0].innerText != "Yes" ) {
            clearInterval(myInterval);
            return;
        }

        const predictions = [...document.getElementById("question_my_forecasts").getElementsByClassName("prediction-set")];

        let sortedPredictions = predictions.sort(function (x, y) {
            var xDate = new Date(x.parentNode.querySelectorAll('[data-localizable-timestamp]')[0].getAttribute('data-localizable-timestamp'))
            var yDate = new Date(y.parentNode.querySelectorAll('[data-localizable-timestamp]')[0].getAttribute('data-localizable-timestamp'))
            return xDate - yDate
        });

        const briersYes = [];
        const briersNo = [];
        sortedPredictions.forEach(function (item, index) {
            let percentageChanceYes =
                item.getElementsByClassName("prediction-values")[0].getElementsByClassName("row row-condensed")[1].getElementsByClassName("col-md-2 col-xs-4")[0].innerText.replace("%", "")/100

            let predictionDate = new Date(item.parentNode.querySelectorAll('[data-localizable-timestamp]')[0].getAttribute('data-localizable-timestamp'))

            // Start by calculating the brier score assuming the answer is YES
            briersYes.push(new BrierAndDate(calculateBrierBinary(true, percentageChanceYes), predictionDate))
            // Now let's assume the answer is NO
            briersNo.push(new BrierAndDate(calculateBrierBinary(false, percentageChanceYes), predictionDate))
        })

        // Now calculate the brier score for yes and no and append it to the page
        const yesBrier = Math.round(calculateAverageBrier(briersYes, closingDate) * 100) / 100;
        const noBrier = Math.round(calculateAverageBrier(briersNo, closingDate) * 100) / 100;

        // Hideous retrieval of div tag that we need to attach the results to.
        let parentElement = document.getElementsByClassName("answer-name")[0].parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
        parentElement.insertAdjacentHTML("afterBegin",
            `<div id=\"brier-nowcast\" class=\"row row-table-headers\"><div class=\"col-md-9 info-heading hidden-xs hidden-sm\">Current Brier Score if yes</div><div class=\"col-md-3 info-heading hidden-xs hidden-sm text-right\">${yesBrier}</div></div>`)
        parentElement.insertAdjacentHTML("afterBegin",
            `<div id=\"brier-nowcast\" class=\"row row-table-headers\"><div class=\"col-md-9 info-heading hidden-xs hidden-sm\">Current Brier Score if no</div><div class=\"col-md-3 info-heading hidden-xs hidden-sm text-right\">${noBrier}</div></div>`)

        clearInterval(myInterval);
    }
},50);


class BrierAndDate {
    constructor(score, dateFrom) {
        this.score = score;
        this.dateFrom = dateFrom;
    }
}


function calculateAverageBrier(brierScoreDates, closingDate) {
    var briersForDays = []
    brierScoreDates.forEach(function (item, index) {
        var dateTo
        if (brierScoreDates[index + 1]) {
            dateTo = brierScoreDates[index + 1].dateFrom
        } else {
            dateTo = closingDate
        }
        daysBetween(item.dateFrom, dateTo)
        for (let i = 0; i < daysBetween(item.dateFrom, dateTo); i++) {
            briersForDays.push(item.score)
        }
    })
    return average(briersForDays)
}

function daysBetween(date1, date2) {
    return Math.round(Math.abs((date1 - date2) / oneDay));
}

/**
 * @param outcome - true if yes, false if no
 * @param yesProb
 * @return the brier score
 */
function calculateBrierBinary(outcome, yesProb) {
    var yesActual
    var noActual
    if (outcome) {
        yesActual = 1
        noActual = 0
    } else {
        yesActual = 0
        noActual = 1
    }
    let noProb = 1 - yesProb
    return ((yesActual - yesProb) * (yesActual - yesProb)) + ((noActual - noProb) * (noActual - noProb))
}