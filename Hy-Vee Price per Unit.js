// ==UserScript==
// @name         Hy-Vee Price per Unit
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds cost per unit to Hy-Vee Aisles Online site!
// @author       Matt Daleo
// @match        https://www.hy-vee.com/grocery/*
// @grant        none
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.12.0/jquery.min.js
// ==/UserScript==
/* jshint -W097 */
"use strict";

function extractQuantity(p) {
    // Receives prices in the form "n / $p.pp", returns n
    var pattQty = /\d+ \//g;
    var nArray; // Array of quantities returned
    var n = -1; // Quantity

    // Extract the quantity
    nArray = p.match(pattQty);
    if (nArray.length === 1) {
        n = parseInt(nArray[0].replace(" /", ""), 10);
    } else {
        // WTF?!?
        console.warn("Function extractQuantity found multiple quantities!!!");
    }

    // Return quantity
    return n;
}

function extractPrice(p) {
    // Receives prices in one of several forms, returns price
    var n = -1; // Quantity
    var priceArray; // Array of prices returned from match function
    var price = -1; // Price to return
    var pattPrice = /\$\d+.\d\d/g; // RegExp to match price
    var pattQtyPrice = /\d+ \/ \$\d+.\d\d/g; // RegExp to match quantity and price

    // Extract the price
    priceArray = p.match(pattPrice);
    if (priceArray.length === 1) {
        price = parseFloat(priceArray[0].replace("$", ""));
    } else {
        // WTF?!?
        console.warn("Function extractPrice found multiple prices!!!");
    }

    // Look for "n / $p.pp" where n is quantity, p is price, return p / n
    if (pattQtyPrice.test(p)) {
        n = extractQuantity(p);
        if (n !== -1) {
            price /= n;
        } else {
            // WTF?!?
            console.warn("Function extractQuantity returned -1!!!");
        }
    }

    // Return price
    return price;
}

function extractUnits(s) {
    // Receives size in one of several forms, returns units, e.g. "lbs", "oz", "fl oz", etc.
    var units = "";

    // Count
    var pattDz = / dz/;
    var pattEa = / ea/;
    var pattCt = / ct/;
    var pattPk = / pk/;

    // Mass
    var pattLbs = / lbs/;
    var pattLb = / lb/;
    var pattOz = / oz/; // Convert to lbs, caution with 'fl oz'

    // Volume
    var pattFlOz = / fl oz/;
    var pattQt = / qt/;
    var pattPt = / pt/;
    var pattGal = / gal/;
    var pattGl = / gl/;
    var pattL = / l/;
    var pattMl = / ml/; // Convert to liters

    // Extract units
    // Count
    units = pattCt.test(s) ? "ct" : units;
    units = pattDz.test(s) ? "dz" : units;
    units = pattEa.test(s) ? "ea" : units;
    units = pattPk.test(s) ? "pk" : units;

    // Mass
    units = (pattLbs.test(s) || pattLb.test(s)) ? "lb" : units;
    units = (pattOz.test(s) && pattFlOz.test(s) === false) ? "oz" : units;

    // Volume
    units = pattFlOz.test(s) ? "fl oz" : units;
    units = pattQt.test(s) ? "qt" : units;
    units = pattPt.test(s) ? "pt" : units;
    units = pattGal.test(s) ? "gal" : units;
    units = pattGl.test(s) ? "gal" : units;
    units = (pattL.test(s) && pattLbs.test(s) === false && pattLb.test(s) === false) ? "l" : units;
    units = pattMl.test(s) ? "ml" : units;

    // Return units
    return units;
}

function extractSize(s) {
    // Receives size in one of several forms, returns size as a number
    var size = parseFloat(s);

    // Return size
    return size;
}

function extractPack(h) {
    // Receives head, returns pack qty if found
    var pack = 1;
    var pattPack = /\d+ Pack/g;

    if (pattPack.test(h)) {
        pack = parseInt(h.match(pattPack)[0], 10);
    }

    // Return pack qty or 1 if not found
    return pack;
}

function main() {
    var pack = $("p.li-head > a");
    var size = $("p[class*='grid_size-']");
    var price = $("p[class*='grid_price-']");
    var altPrice = $("p[class*='grid_price_alt-']");
    var newPrice;
    var newUnits;
    var newSize;
    var newPack;

    // Reveal altPrice
    altPrice.css("display", "block");

    // Walk through each product
    $.each(size, function (i, val) {
        if (true) {
            // Extract information to calculate new altPrice
            newPrice = extractPrice(price[i].innerHTML);
            newUnits = extractUnits(size[i].innerHTML);
            newSize = extractSize(size[i].innerHTML);
            newPrice /= newSize;
            newPack = extractPack(pack[i].innerHTML);
            newPrice /= newPack;

            // Convert units to make comparison easier
            // Convert oz to lbs
            if (newUnits === "oz") {
                newUnits = "lb";
                newPrice *= 16;
            }
            // Convert ml to l
            if (newUnits === "ml") {
                newUnits = "l";
                newPrice *= 1000;
            }
            // Convert fl oz, pt, qt to gal
            if (newUnits === "fl oz") {
                newUnits = "gal";
                newPrice *= 128;
            }
            if (newUnits === "pt") {
                newUnits = "gal";
                newPrice *= 8;
            }
            if (newUnits === "qt") {
                newUnits = "gal";
                newPrice *= 4;
            }
            
            // Imperial
            // Convert kg to lbs
            if (newUnits === "kg") {
                newUnits = "lb";
                newPrice /= 2.204622622;
            }
            // Convert l to gal
            if (newUnits === "l") {
                newUnits = "gal";
                newPrice /= 0.264172052;
            }
            
            /* // Metric
            // Convert lbs to kg
            if (newUnits === "lb") {
                newUnits = "kg";
                newPrice *= 2.204622622;
            }
            // Convert gal to l
            if (newUnits === "gal") {
                newUnits = "l";
                newPrice *= 0.264172052;
            } */

            // Write new altPrice
            altPrice[i].innerHTML = "$" + newPrice.toFixed(3) + " per " + newUnits;
        }
    });
}

// Instead of using the setInterval in the document.ready function, I should be checking to see if an AJAX event fired and then re-running main
/*$(document).ajaxSend(function () {
    console.log("Triggered ajaxSend handler.");
    main();
});*/

$(document).ready(function () {
    if (typeof jQuery !== "function") {
        console.warn("User Script: jQuery NOT loaded");
    }

    main();

    // This should be an event listener for the AJAX call whenever the list is updated, but how?!?
    var intervalID = window.setInterval(main, 1000);

    // TODO: add sort by altPrice - no idea how - look at MyFitnessPal add on
});
