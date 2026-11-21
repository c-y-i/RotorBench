import { DEFAULT_RADIO_CONFIG, getRadioTarget } from "../data/radioProfiles";
import { buildRadioEndpointPlan } from "./radioEndpointPlan";

const revA3 = getRadioTarget("aerialkit-elrs-rev-a3");
const genericTx = getRadioTarget("generic-elrs-24-tx");
const rangerNano = getRadioTarget("radiomaster-ranger-nano-elrs-24-tx");
const ranger = getRadioTarget("radiomaster-ranger-elrs-24-tx");

test("native USB keeps baud semantics and RF evidence separate", () => {
  const plan = buildRadioEndpointPlan({
    ...DEFAULT_RADIO_CONFIG,
    role: "tx",
    hostTransport: "native-usb",
  }, revA3);

  expect(plan).toMatchObject({
    documented: true,
    hostTransportLabel: "Native USB CDC",
    roleLabel: "transmitter",
    rfVerified: false,
    scope: "planning endpoint checklist; RF and hardware not tested",
  });
  expect(plan.steps).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "host-usb" }),
    expect.objectContaining({ id: "rf-observation" }),
  ]));
});

test("Rev A3 host UART names the 400000-baud documented pins", () => {
  const plan = buildRadioEndpointPlan({
    ...DEFAULT_RADIO_CONFIG,
    role: "tx",
    hostTransport: "uart",
  }, revA3);

  expect(plan.steps.find((step) => step.id === "host-uart").detail)
    .toMatch(/J3\.4\/GPIO44.*400000 baud/i);
  expect(plan.documented).toBe(true);
});

test("receiver plans keep the 420000-baud FC path distinct", () => {
  const plan = buildRadioEndpointPlan({
    ...DEFAULT_RADIO_CONFIG,
    role: "rx",
    hostTransport: "native-usb",
  }, revA3);

  expect(plan.steps.find((step) => step.id === "fc-uart").detail)
    .toMatch(/420000 baud/i);
});

test("generic targets remain explicitly unmapped", () => {
  const plan = buildRadioEndpointPlan({
    ...DEFAULT_RADIO_CONFIG,
    targetId: genericTx.id,
    role: "tx",
    hostTransport: "unspecified",
  }, genericTx);

  expect(plan).toMatchObject({
    documented: false,
    hostTransportLabel: "Verify target transport",
  });
  expect(plan.steps[2]).toMatchObject({ id: "host-unknown" });
});

test("Ranger Nano documents the module bay without claiming a host UART rate", () => {
  const plan = buildRadioEndpointPlan({
    ...DEFAULT_RADIO_CONFIG,
    targetId: rangerNano.id,
    role: "tx",
    hostTransport: "module-bay",
  }, rangerNano);

  expect(plan).toMatchObject({
    documented: true,
    hostTransportLabel: "Handset module bay",
    roleLabel: "transmitter",
    rfVerified: false,
  });
  const step = plan.steps.find((candidate) => candidate.id === "host-module-bay");
  expect(step.detail).toMatch(/Nano 8-pin: CRSF, GND, 5-12 V/i);
  expect(step.detail).not.toMatch(/baud/i);
  expect(plan.copyText).not.toMatch(/baud/i);
});

test("module-bay handoff names the selected handset and bay state", () => {
  const plan = buildRadioEndpointPlan({
    ...DEFAULT_RADIO_CONFIG,
    targetId: ranger.id,
    role: "tx",
    hostTransport: "module-bay",
    hostBay: "nano-8",
    handsetId: "radiomaster-boxer",
  }, ranger);

  expect(plan).toMatchObject({
    handsetId: "radiomaster-boxer",
    handsetName: "RadioMaster Boxer",
    handsetBayCompatibility: "conflict",
  });
  expect(plan.copyText).toContain("# Handset: RadioMaster Boxer");
  expect(plan.copyText).toContain("# Handset bay: conflict");
  expect(plan.steps.find((step) => step.id === "host-module-bay").detail)
    .toMatch(/RadioMaster Boxer \(conflict\).*without forcing the bay/i);
});
