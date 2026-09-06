import { Injectable } from '@nestjs/common';

// TODO: The central marketplace object. Validate and store capability declarations — an agent
// cannot merely claim "I am a DeFi agent"; it declares name, assets, protocols, I/O schema,
// pricing model and settlement rail. Everything downstream matches on this, not on prose.
@Injectable()
export class CapabilityRegistryService {}
